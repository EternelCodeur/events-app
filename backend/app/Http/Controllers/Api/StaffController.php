<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StaffResource;
use App\Models\Staff;
use App\Models\Entreprise;
use App\Models\Event;
use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StaffController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Staff::query();
        if (($user->role ?? 'admin') !== 'superadmin') {
            $query->where('entreprise_id', $user->entreprise_id);
        } else {
            if ($request->filled('entrepriseId')) {
                $query->where('entreprise_id', (int) $request->integer('entrepriseId'));
            }
        }

        // Recompute statuses for staff in scope (now-active if they have ongoing/upcoming non-cancelled assignments)
        $idsToRecalc = (clone $query)->pluck('id');
        $nowDate = date('Y-m-d');
        $nowTime = date('H:i');
        foreach ($idsToRecalc as $sid) {
            $hasActive = DB::table('event_staff_assignments as esa')
                ->join('events as ev', 'ev.id', '=', 'esa.event_id')
                ->where('esa.staff_id', $sid)
                ->where(function ($w) use ($nowDate, $nowTime) {
                    $w->where(function ($q1) use ($nowDate) {
                        $q1->where('ev.status', 'en_cours')
                           ->whereDate('ev.date', '=', $nowDate);
                    })->orWhere(function ($q2) use ($nowDate, $nowTime) {
                        $q2->where('ev.status', 'confirme')
                           ->whereDate('ev.date', '=', $nowDate)
                           ->where(function ($q) use ($nowTime) {
                               $q->where(function ($qq) use ($nowTime) {
                                   $qq->whereNotNull('ev.start_time')
                                      ->whereNotNull('ev.end_time')
                                      ->where('ev.start_time', '<=', $nowTime)
                                      ->where('ev.end_time', '>', $nowTime);
                               })->orWhere(function ($qq) use ($nowTime) {
                                   $qq->whereNull('ev.start_time')
                                      ->whereNotNull('ev.end_time')
                                      ->where('ev.end_time', '>', $nowTime);
                               })->orWhere(function ($qq) use ($nowTime) {
                                   $qq->whereNotNull('ev.start_time')
                                      ->whereNull('ev.end_time')
                                      ->where('ev.start_time', '<=', $nowTime);
                               })->orWhere(function ($qq) {
                                   $qq->whereNull('ev.start_time')
                                      ->whereNull('ev.end_time');
                               });
                           });
                    });
                })
                ->exists();
            DB::table('staff')->where('id', $sid)->update([
                'status' => $hasActive ? 'active' : 'inactive',
                'updated_at' => now(),
            ]);
        }

        if ($request->filled('eventId')) {
            $event = Event::findOrFail((int) $request->integer('eventId'));
            if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
                abort(403, 'Forbidden');
            }
            $date = (string) $event->date;
            $start = $event->start_time ? substr((string) $event->start_time, 0, 5) : null;
            $end = $event->end_time ? substr((string) $event->end_time, 0, 5) : null;

            $query->whereNotExists(function ($sub) use ($date, $start, $end) {
                $sub->select(DB::raw('1'))
                    ->from('event_staff_assignments as esa')
                    ->join('events as ev', 'ev.id', '=', 'esa.event_id')
                    ->whereColumn('esa.staff_id', 'staff.id')
                    ->whereIn('ev.status', ['en_attente', 'confirme'])
                    ->whereDate('ev.date', '=', $date)
                    ->where(function ($q) use ($start, $end) {
                        if ($start && $end) {
                            $q->whereNull('ev.start_time')
                              ->orWhereNull('ev.end_time')
                              ->orWhere(function ($qq) use ($start, $end) {
                                  $qq->where('ev.start_time', '<', $end)
                                     ->where('ev.end_time', '>', $start);
                              });
                        } else {
                            $q->whereRaw('1 = 1');
                        }
                    });
            });
        }
        return StaffResource::collection($query->latest()->get());
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:191'],
            'phone' => ['required', 'string', 'max:191'],
        ]);

        // resolve entreprise
        if (($user->role ?? 'admin') === 'superadmin') {
            $entrepriseId = $request->input('entrepriseId') ?: null;
        } else {
            $entrepriseId = $user->entreprise_id;
        }
        if (!$entrepriseId) {
            abort(422, 'Entreprise non définie');
        }

        // Duplicate check on name (case-insensitive) per entreprise
        $name = strtolower($data['name']);
        $exists = Staff::where('entreprise_id', $entrepriseId)
            ->whereRaw('LOWER(name) = ?', [$name])
            ->exists();
        if ($exists) {
            abort(422, "Cet employé existe déjà");
        }

        $staff = Staff::create([
            'entreprise_id' => $entrepriseId,
            'name' => $data['name'],
            'role' => $data['role'],
            'phone' => $data['phone'] ?? null,
            'status' => 'inactive',
        ]);
        // Create staff folder under entreprise slug
        $entreprise = Entreprise::findOrFail($entrepriseId);
        $slug = (string) $entreprise->slug;
        $folderName = Str::slug((string) $staff->name, '-');
        $folder = 'entreprises/' . $slug . '/staff/' . $folderName;
        Storage::disk('local')->makeDirectory($folder);

        return new StaffResource($staff);
    }

    public function show(Request $request, Staff $staff)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$staff->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        return new StaffResource($staff);
    }

    public function update(Request $request, Staff $staff)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$staff->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'role' => ['sometimes', 'string', 'max:191'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:191'],
        ]);

        // If name is changing, prevent duplicate per entreprise (case-insensitive)
        $newName = array_key_exists('name', $data) ? $data['name'] : $staff->name;
        if ($newName !== $staff->name) {
            $exists = Staff::where('entreprise_id', $staff->entreprise_id)
                ->where('id', '<>', $staff->id)
                ->whereRaw('LOWER(name) = ?', [strtolower($newName)])
                ->exists();
            if ($exists) {
                abort(422, "Cet employé existe déjà");
            }
        }

        $oldName = (string) $staff->name;
        $oldSlugName = Str::slug($oldName, '-');

        $staff->fill($data);
        $staff->save();

        // If name changed, rename/move the local folder accordingly
        if ($oldName !== (string) $staff->name) {
            try {
                $entreprise = Entreprise::findOrFail($staff->entreprise_id);
                $companySlug = (string) $entreprise->slug;
                $base = 'entreprises/' . $companySlug . '/staff/';
                $newSlugName = Str::slug((string) $staff->name, '-');
                $oldPath = $base . $oldSlugName;
                $newPath = $base . $newSlugName;

                // Legacy path by id (from older versions)
                $legacyIdPath = $base . $staff->id;

                $disk = Storage::disk('local');
                if ($disk->exists($oldPath)) {
                    if (!$disk->exists($newPath)) {
                        $disk->move($oldPath, $newPath);
                    } else {
                        // Destination exists unexpectedly; back up old folder to avoid data loss
                        $backup = $oldPath . '-backup-' . date('YmdHis');
                        $disk->move($oldPath, $backup);
                    }
                } elseif ($disk->exists($legacyIdPath)) {
                    // Move from legacy id path to new slug
                    if (!$disk->exists($newPath)) {
                        $disk->move($legacyIdPath, $newPath);
                    } else {
                        $backup = $legacyIdPath . '-backup-' . date('YmdHis');
                        $disk->move($legacyIdPath, $backup);
                    }
                } else {
                    // Ensure new folder exists at least
                    if (!$disk->exists($newPath)) {
                        $disk->makeDirectory($newPath);
                    }
                }
            } catch (\Throwable $_) {
                // ignore fs errors to not block update
            }
        }

        return new StaffResource($staff);
    }

    public function destroy(Request $request, Staff $staff)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$staff->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        // Delete staff folder(s)
        try {
            $entreprise = Entreprise::findOrFail($staff->entreprise_id);
            $slug = (string) $entreprise->slug;
            $folderSlugName = Str::slug((string) $staff->name, '-');
            $basePathSlug = 'entreprises/' . $slug . '/staff/' . $folderSlugName;
            $basePathId = 'entreprises/' . $slug . '/staff/' . $staff->id;
            Storage::disk('local')->deleteDirectory($basePathSlug);
            Storage::disk('local')->deleteDirectory($basePathId);
        } catch (\Throwable $_) {
            // ignore folder deletion errors
        }

        $staff->delete();
        return response()->noContent();
    }

    public function storeSignature(Request $request, Staff $staff)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$staff->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        $data = $request->validate([
            'type' => ['required', 'in:arrival,departure'],
            'image' => ['required', 'string'], // data URL: data:image/png;base64,...
            'eventId' => ['required', 'integer'],
        ]);

        $dataUrl = (string) $data['image'];
        if (!preg_match('/^data:image\/(png|jpeg);base64,/', $dataUrl, $m)) {
            abort(422, 'Format de signature invalide');
        }
        $ext = ($m[1] === 'jpeg') ? 'jpg' : $m[1];
        $base64 = substr($dataUrl, strpos($dataUrl, ',') + 1);
        $binary = base64_decode($base64);
        if ($binary === false) {
            abort(422, 'Image invalide');
        }

        $entreprise = Entreprise::findOrFail($staff->entreprise_id);
        $slug = (string) $entreprise->slug;
        $folderName = Str::slug((string) $staff->name, '-');
        $base = 'entreprises/' . $slug . '/staff/' . $folderName . '/signatures';
        Storage::disk('local')->makeDirectory($base);
        $prefix = $data['type'] === 'arrival' ? 'arrivee' : 'depart';
        $filename = $prefix . '_' . date('Ymd_His') . '.' . $ext;
        Storage::disk('local')->put($base . '/' . $filename, $binary);

        // Persist attendance per event
        $event = Event::findOrFail((int) $data['eventId']);
        if (($user->role ?? 'admin') !== 'superadmin') {
            if ((int)$event->entreprise_id !== (int)$user->entreprise_id || (int)$staff->entreprise_id !== (int)$user->entreprise_id) {
                abort(403, 'Forbidden');
            }
        }

        $attendance = Attendance::firstOrNew([
            'event_id' => $event->id,
            'staff_id' => $staff->id,
        ]);
        $attendance->entreprise_id = $event->entreprise_id;
        if ($data['type'] === 'arrival') {
            if (empty($attendance->arrived_at)) {
                $attendance->arrived_at = now();
            }
            $attendance->arrival_signature_path = $base . '/' . $filename;
        } else { // departure
            if (empty($attendance->departed_at)) {
                $attendance->departed_at = now();
            }
            $attendance->departure_signature_path = $base . '/' . $filename;
        }
        $attendance->save();

        return response()->json([
            'path' => $base . '/' . $filename,
            'attendance' => [
                'staffId' => $staff->id,
                'eventId' => $event->id,
                'arrivedAt' => $attendance->arrived_at,
                'departedAt' => $attendance->departed_at,
            ],
        ], 201);
    }

    public function monthlyAttendances(Request $request, Staff $staff)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$staff->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        $month = (string) ($request->query('month') ?: date('Y-m'));
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            $month = date('Y-m');
        }
        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end = (clone $start)->endOfMonth();
        $startDt = (clone $start)->startOfDay();
        $endDt = (clone $end)->endOfDay();

        $rows = Attendance::query()
            ->join('events as ev', 'ev.id', '=', 'attendances.event_id')
            ->where('attendances.staff_id', $staff->id)
            ->where(function ($q) use ($start, $end, $startDt, $endDt) {
                $q->whereBetween('ev.date', [$start->toDateString(), $end->toDateString()])
                  ->orWhereBetween('attendances.arrived_at', [$startDt->toDateTimeString(), $endDt->toDateTimeString()])
                  ->orWhereBetween('attendances.departed_at', [$startDt->toDateTimeString(), $endDt->toDateTimeString()]);
            })
            ->when((($user->role ?? 'admin') !== 'superadmin'), function ($q) use ($user) {
                $q->where('ev.entreprise_id', $user->entreprise_id);
            })
            ->orderBy('ev.date', 'asc')
            ->orderBy('ev.start_time', 'asc')
            ->get([
                'attendances.event_id',
                'attendances.arrived_at',
                'attendances.departed_at',
                'attendances.arrival_signature_path',
                'attendances.departure_signature_path',
                'ev.title',
                'ev.date',
                'ev.start_time',
                'ev.end_time',
            ])
            ->map(function ($r) use ($staff) {
                $arrivalFilename = $r->arrival_signature_path ? basename((string) $r->arrival_signature_path) : null;
                $departureFilename = $r->departure_signature_path ? basename((string) $r->departure_signature_path) : null;
                return [
                    'eventId' => (int) $r->event_id,
                    'eventTitle' => (string) ($r->title ?? ''),
                    'date' => (string) $r->date,
                    'startTime' => $r->start_time ? substr((string)$r->start_time, 0, 5) : null,
                    'endTime' => $r->end_time ? substr((string)$r->end_time, 0, 5) : null,
                    'arrivedAt' => $r->arrived_at,
                    'departedAt' => $r->departed_at,
                    // Renvoie des chemins relatifs pour que le front passe par le proxy Vite (/api -> backend)
                    'arrivalSignatureUrl' => $arrivalFilename
                        ? '/api/utilisateur/staff/' . $staff->id . '/signatures/arrival/' . $arrivalFilename
                        : null,
                    'departureSignatureUrl' => $departureFilename
                        ? '/api/utilisateur/staff/' . $staff->id . '/signatures/departure/' . $departureFilename
                        : null,
                ];
            })
            ->values();

        return response()->json($rows);
    }

    public function signatureFile(Request $request, Staff $staff, string $type, string $filename)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$staff->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        if (!in_array($type, ['arrival', 'departure'], true)) {
            abort(422, 'Type invalide');
        }

        $entreprise = Entreprise::findOrFail($staff->entreprise_id);
        $slug = (string) $entreprise->slug;
        $folderSlug = 'entreprises/' . $slug . '/staff/' . Str::slug((string) $staff->name, '-') . '/signatures/' . $filename;
        $folderId = 'entreprises/' . $slug . '/staff/' . $staff->id . '/signatures/' . $filename;
        $disk = Storage::disk('local');
        $path = null;
        if ($disk->exists($folderSlug)) {
            $path = $folderSlug;
        } elseif ($disk->exists($folderId)) {
            $path = $folderId;
        }
        if (!$path) {
            abort(404);
        }
        $binary = $disk->get($path);
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $mime = $ext === 'jpg' || $ext === 'jpeg' ? 'image/jpeg' : ($ext === 'png' ? 'image/png' : 'application/octet-stream');
        return response($binary, 200)->header('Content-Type', $mime);
    }
}
