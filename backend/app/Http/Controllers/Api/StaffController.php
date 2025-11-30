<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StaffResource;
use App\Models\Staff;
use App\Models\Entreprise;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        $staff->fill($data);
        $staff->save();

        return new StaffResource($staff);
    }

    public function destroy(Request $request, Staff $staff)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$staff->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        $staff->delete();
        return response()->noContent();
    }
}
