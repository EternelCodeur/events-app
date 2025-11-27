<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Company;
use Illuminate\Support\Str;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use App\Events\CompanyCreated;
use App\Events\CompanyUpdated;
use App\Events\CompanyDeleted;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Support\Facades\Storage;

class CompanyController extends Controller
{
    public function index()
    {
        $companies = Company::orderByDesc('id')->get()->map(function ($c) {
            return [
                'id' => (string) $c->id,
                'name' => $c->name,
                'email' => $c->email,
                'phone' => $c->phone,
                'adminName' => $c->admin_name,
                'status' => $c->status ?? 'active',
            ];
        });

        return response()->json($companies);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'adminName' => ['nullable', 'string', 'max:255'],
        ]);

        $slug = Str::slug($data['name']);
        $email = isset($data['email']) ? strtolower($data['email']) : null;

        if (Company::where('name_slug', $slug)->exists()) {
            return response()->json([
                'message' => 'Une entreprise avec un nom similaire existe déjà.',
                'field' => 'name',
            ], 422);
        }

        if ($email && Company::whereRaw('lower(email) = ?', [$email])->exists()) {
            return response()->json([
                'message' => "Une entreprise avec cet email existe déjà.",
                'field' => 'email',
            ], 422);
        }

        // Si un utilisateur avec cet email existe déjà:
        // - s'il n'est rattaché à aucune entreprise, on le rattachera à la nouvelle company
        // - s'il est déjà rattaché à une entreprise, on bloque
        $existingUser = null;
        if ($email) {
            $existingUser = User::whereRaw('lower(email) = ?', [$email])->first();
            if ($existingUser && !empty($existingUser->company_id)) {
                return response()->json([
                    'message' => "Cet email est déjà utilisé par un utilisateur d'une autre entreprise.",
                    'field' => 'email',
                ], 422);
            }
        }

        $company = DB::transaction(function () use ($slug, $data, $email, $existingUser) {
            $company = Company::create([
                'name_slug' => $slug,
                'name' => $data['name'],
                'email' => $email,
                'phone' => $data['phone'] ?? null,
                'admin_name' => $data['adminName'] ?? null,
                'status' => 'active',
            ]);

            // Créer ou lier l'utilisateur admin à l'entreprise (si email fourni)
            if ($email) {
                if ($existingUser) {
                    // Lier l'utilisateur existant non rattaché
                    $existingUser->name = $data['adminName'] ?? ($existingUser->name ?: $data['name']);
                    if (!$existingUser->role) { $existingUser->role = 'admin'; }
                    $existingUser->company_id = $company->id;
                    $existingUser->save();
                } else {
                    User::create([
                        'name' => $data['adminName'] ?? $data['name'],
                        'email' => $email,
                        // sera hashé automatiquement via cast 'password' => 'hashed'
                        'password' => "password123",
                        'role' => 'admin',
                        'company_id' => $company->id,
                    ]);
                }
            }

            return $company;
        });

        event(new CompanyCreated($company));
        $this->broadcastToSse('CompanyCreated', [
            'id' => (string) $company->id,
            'name' => $company->name,
            'email' => $company->email,
            'phone' => $company->phone,
            'adminName' => $company->admin_name,
            'status' => $company->status ?? 'active',
        ]);

        try {
            $dir = 'companies/' . ($company->name_slug ?: Str::slug($company->name));
            if (!Storage::disk('public')->exists($dir)) {
                Storage::disk('public')->makeDirectory($dir);
            }
        } catch (\Throwable $e) {
            // ignore fs errors
        }

        return response()->json([
            'id' => (string) $company->id,
            'name' => $company->name,
            'email' => $company->email,
            'phone' => $company->phone,
            'adminName' => $company->admin_name,
            'status' => $company->status ?? 'active',
        ], 201);
    }

    public function update(Request $request, Company $company)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:255'],
            'adminName' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);

        $oldEmailLower = $company->email ? strtolower($company->email) : null;
        $oldSlug = $company->name_slug;

        if (array_key_exists('name', $data)) {
            $slug = Str::slug($data['name']);
            $existsName = Company::where('name_slug', $slug)
                ->where('id', '!=', $company->id)
                ->exists();
            if ($existsName) {
                return response()->json([
                    'message' => 'Une entreprise avec un nom similaire existe déjà.',
                    'field' => 'name',
                ], 422);
            }
        }

        $newEmailLower = null;
        if (array_key_exists('email', $data)) {
            $newEmailLower = $data['email'] ? strtolower($data['email']) : null;

            if ($newEmailLower) {
                $existsCompanyEmail = Company::whereRaw('lower(email) = ?', [$newEmailLower])
                    ->where('id', '!=', $company->id)
                    ->exists();
                if ($existsCompanyEmail) {
                    return response()->json([
                        'message' => "Une entreprise avec cet email existe déjà.",
                        'field' => 'email',
                    ], 422);
                }

                if (!$oldEmailLower || $newEmailLower !== $oldEmailLower) {
                    if (User::whereRaw('lower(email) = ?', [$newEmailLower])->exists()) {
                        return response()->json([
                            'message' => "Cet email est déjà utilisé par un utilisateur.",
                            'field' => 'email',
                        ], 422);
                    }
                }
            }
        }

        $updated = DB::transaction(function () use ($company, $data, $oldEmailLower, $newEmailLower) {
            $payload = [];

            if (array_key_exists('name', $data)) {
                $payload['name'] = $data['name'];
                $payload['name_slug'] = Str::slug($data['name']);
            }
            if (array_key_exists('email', $data)) {
                $payload['email'] = $newEmailLower;
            }
            if (array_key_exists('phone', $data)) {
                $payload['phone'] = $data['phone'];
            }
            if (array_key_exists('adminName', $data)) {
                $payload['admin_name'] = $data['adminName'];
            }
            if (array_key_exists('status', $data)) {
                $payload['status'] = $data['status'];
            }

            if (!empty($payload)) {
                $company->update($payload);
            }

            $targetEmailLower = array_key_exists('email', $data) ? $newEmailLower : $oldEmailLower;

            $user = User::where('company_id', $company->id)->where('role', 'admin')->first();
            if (!$user && $oldEmailLower) {
                $user = User::whereRaw('lower(email) = ?', [$oldEmailLower])->first();
            }

            if ($user) {
                if (array_key_exists('email', $data)) {
                    if ($targetEmailLower === null) {
                        $user->delete();
                        return $company->fresh();
                    }
                    $user->email = $targetEmailLower;
                }
                if (array_key_exists('adminName', $data)) {
                    if (!is_null($data['adminName'])) {
                        $user->name = $data['adminName'];
                    }
                }
                if (!$user->company_id) {
                    $user->company_id = $company->id;
                }
                $user->save();
            } else {
                if ($targetEmailLower) {
                    $existsUserTarget = User::whereRaw('lower(email) = ?', [$targetEmailLower])->exists();
                    if (!$existsUserTarget) {
                        User::create([
                            'name' => array_key_exists('adminName', $data) && !is_null($data['adminName']) ? $data['adminName'] : ($company->name),
                            'email' => $targetEmailLower,
                            'password' => "password123",
                            'role' => 'admin',
                            'company_id' => $company->id,
                        ]);
                    }
                }
            }

            return $company->fresh();
        });

        event(new CompanyUpdated($updated));
        $this->broadcastToSse('CompanyUpdated', [
            'id' => (string) $updated->id,
            'name' => $updated->name,
            'email' => $updated->email,
            'phone' => $updated->phone,
            'adminName' => $updated->admin_name,
            'status' => $updated->status ?? 'active',
        ]);

        // Renommer/assurer le dossier si le slug de l'entreprise a changé
        try {
            $newSlug = $updated->name_slug ?: Str::slug($updated->name);
            $from = $oldSlug ? ('companies/' . $oldSlug) : null;
            $to = 'companies/' . $newSlug;

            if ($from && $oldSlug !== $newSlug && \Illuminate\Support\Facades\Storage::disk('public')->exists($from)) {
                if (!\Illuminate\Support\Facades\Storage::disk('public')->exists($to)) {
                    \Illuminate\Support\Facades\Storage::disk('public')->move($from, $to);
                }
            }
            if (!\Illuminate\Support\Facades\Storage::disk('public')->exists($to)) {
                \Illuminate\Support\Facades\Storage::disk('public')->makeDirectory($to);
            }
        } catch (\Throwable $e) {
            // ignore fs errors
        }

        return response()->json([
            'id' => (string) $updated->id,
            'name' => $updated->name,
            'email' => $updated->email,
            'phone' => $updated->phone,
            'adminName' => $updated->admin_name,
            'status' => $updated->status ?? 'active',
        ]);
    }

    public function destroy(Company $company)
    {
        $id = (string) $company->id;
        $slug = $company->name_slug ?: Str::slug($company->name);

        DB::transaction(function () use ($company) {
            User::where('company_id', $company->id)->delete();

            $email = $company->email;
            if ($email) {
                User::whereNull('company_id')
                    ->whereRaw('lower(email) = ?', [strtolower($email)])
                    ->delete();
            }

            $company->delete();
        });

        event(new CompanyDeleted($id));
        $this->broadcastToSse('CompanyDeleted', [
            'id' => $id,
        ]);

        // Supprimer le dossier de l'entreprise
        try {
            $dir = 'companies/' . $slug;
            if (\Illuminate\Support\Facades\Storage::disk('public')->exists($dir)) {
                \Illuminate\Support\Facades\Storage::disk('public')->deleteDirectory($dir);
            }
        } catch (\Throwable $e) {
            // ignore fs errors
        }

        return response()->noContent();
    }

    public function stream(Request $request): StreamedResponse
    {
        $lastIdHeader = $request->headers->get('Last-Event-ID');
        $lastId = is_null($lastIdHeader) ? 0 : (int) $lastIdHeader;

        $response = new StreamedResponse(function () use (&$lastId) {
            @ini_set('output_buffering', 'off');
            @ini_set('zlib.output_compression', '0');
            @ini_set('implicit_flush', '1');
            @ob_implicit_flush(1);

            $started = time();
            while (true) {
                $events = Cache::get('companies_broadcast_events', []);
                foreach ($events as $evt) {
                    if (($evt['id'] ?? 0) > $lastId) {
                        echo 'id: ' . $evt['id'] . "\n";
                        echo 'event: ' . $evt['type'] . "\n";
                        echo 'data: ' . json_encode($evt['payload']) . "\n\n";
                        $lastId = $evt['id'];
                    }
                }
                // keepalive comment
                echo ": keepalive\n\n";
                if (function_exists('flush')) { flush(); }
                if (connection_aborted()) { break; }
                if (time() - $started > 300) { break; } // 5 minutes
                sleep(2);
            }
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache, no-transform');
        $response->headers->set('X-Accel-Buffering', 'no');
        return $response;
    }

    private function broadcastToSse(string $type, array $payload): void
    {
        $seq = (int) Cache::get('companies_broadcast_seq', 0) + 1;
        Cache::forever('companies_broadcast_seq', $seq);

        $events = Cache::get('companies_broadcast_events', []);
        $events[] = [
            'id' => $seq,
            'type' => $type,
            'payload' => $payload,
        ];
        if (count($events) > 200) {
            $events = array_slice($events, -200);
        }
        Cache::put('companies_broadcast_events', $events, 86400);
    }
}
