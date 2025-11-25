<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Company;
use Illuminate\Support\Str;
use App\Models\User;
use Illuminate\Support\Facades\DB;

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

        if ($email && User::whereRaw('lower(email) = ?', [$email])->exists()) {
            return response()->json([
                'message' => "Cet email est déjà utilisé par un utilisateur.",
                'field' => 'email',
            ], 422);
        }

        $company = DB::transaction(function () use ($slug, $data, $email) {
            $company = Company::create([
                'name_slug' => $slug,
                'name' => $data['name'],
                'email' => $email,
                'phone' => $data['phone'] ?? null,
                'admin_name' => $data['adminName'] ?? null,
                'status' => 'active',
            ]);

            // Créer aussi un utilisateur pour l'entreprise (si email fourni)
            if ($email) {
                User::create([
                    'name' => $data['name'],
                    'email' => $email,
                    // sera hashé automatiquement via cast 'password' => 'hashed'
                    'password' => "password123",
                    // 'password' => Str::random(12),
                    'role' => 'admin',
                ]);
            }

            return $company;
        });

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
            'status' => ['required', 'in:active,inactive'],
        ]);

        $updated = DB::transaction(function () use ($company, $data) {
            $company->update(['status' => $data['status']]);
            return $company->fresh();
        });

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
        DB::transaction(function () use ($company) {
            $email = $company->email;
            if ($email) {
                User::whereRaw('lower(email) = ?', [strtolower($email)])->delete();
            }
            $company->delete();
        });

        return response()->noContent();
    }
}
