<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StaffResource;
use App\Models\Event;
use App\Models\Staff;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EventAssignmentController extends Controller
{
    public function index(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        $query = Staff::query()
            ->join('event_staff_assignments as esa', 'esa.staff_id', '=', 'staff.id')
            ->where('esa.event_id', $event->id)
            ->select('staff.*')
            ->orderByDesc('staff.id');

        if (($user->role ?? 'admin') !== 'superadmin') {
            $query->where('staff.entreprise_id', $user->entreprise_id);
        }

        $staff = $query->get();
        $ids = $staff->pluck('id');
        if ($ids->count() > 0) {
            $nowDate = date('Y-m-d');
            $nowTime = date('H:i');
            $activeIds = DB::table('event_staff_assignments as esa')
                ->join('events as ev', 'ev.id', '=', 'esa.event_id')
                ->whereIn('esa.staff_id', $ids)
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
                ->distinct()
                ->pluck('esa.staff_id')
                ->toArray();
            foreach ($staff as $s) {
                $s->status = in_array($s->id, $activeIds, true) ? 'active' : 'inactive';
            }
        }
        return StaffResource::collection($staff);
    }

    public function store(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        $data = $request->validate([
            'staffId' => ['required', 'integer'],
        ]);

        if (in_array((string)$event->status, ['termine', 'annuler', 'echoue'], true)) {
            abort(422, "Impossible d'assigner du personnel à un événement terminé, annulé ou échoué");
        }

        $staff = Staff::findOrFail((int) $data['staffId']);
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$staff->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        // Prevent time conflicts: same date and overlapping time with another non-cancelled event
        $date = (string) $event->date;
        $start = $event->start_time ? substr((string) $event->start_time, 0, 5) : null;
        $end = $event->end_time ? substr((string) $event->end_time, 0, 5) : null;
        $conflict = DB::table('event_staff_assignments as esa')
            ->join('events as ev', 'ev.id', '=', 'esa.event_id')
            ->where('esa.staff_id', $staff->id)
            ->where('ev.id', '<>', $event->id)
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
            })
            ->exists();
        if ($conflict) {
            abort(422, "Cet employé est déjà assigné à un autre événement sur le même créneau");
        }

        $exists = DB::table('event_staff_assignments')
            ->where('event_id', $event->id)
            ->where('staff_id', $staff->id)
            ->exists();
        if ($exists) {
            abort(422, 'Cet employé est déjà assigné à cet événement');
        }

        DB::table('event_staff_assignments')->insert([
            'entreprise_id' => $event->entreprise_id,
            'event_id' => $event->id,
            'staff_id' => $staff->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $nowDate = date('Y-m-d');
        $nowTime = date('H:i');
        $hasActiveNow = DB::table('event_staff_assignments as esa')
            ->join('events as ev', 'ev.id', '=', 'esa.event_id')
            ->where('esa.staff_id', $staff->id)
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
        DB::table('staff')->where('id', $staff->id)->update([
            'status' => $hasActiveNow ? 'active' : 'inactive',
            'updated_at' => now(),
        ]);
        $staff->status = $hasActiveNow ? 'active' : 'inactive';
        $staff->updated_at = now();

        return new StaffResource($staff);
    }

    public function destroy(Request $request, Event $event, Staff $staff)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin') {
            if ((int)$event->entreprise_id !== (int)$user->entreprise_id || (int)$staff->entreprise_id !== (int)$user->entreprise_id) {
                abort(403, 'Forbidden');
            }
        }

        DB::table('event_staff_assignments')
            ->where('event_id', $event->id)
            ->where('staff_id', $staff->id)
            ->delete();

        $nowDate = date('Y-m-d');
        $nowTime = date('H:i');
        $hasActive = DB::table('event_staff_assignments as esa')
            ->join('events as ev', 'ev.id', '=', 'esa.event_id')
            ->where('esa.staff_id', $staff->id)
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
        DB::table('staff')->where('id', $staff->id)->update([
            'status' => $hasActive ? 'active' : 'inactive',
            'updated_at' => now(),
        ]);

        return response()->noContent();
    }

    public function attendances(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        // Only include staff assigned to this event
        $assignedStaffIds = DB::table('event_staff_assignments')
            ->where('event_id', $event->id)
            ->pluck('staff_id')
            ->toArray();

        if (empty($assignedStaffIds)) {
            return response()->json([]);
        }

        $records = Attendance::query()
            ->where('event_id', $event->id)
            ->whereIn('staff_id', $assignedStaffIds)
            ->get(['staff_id', 'arrived_at', 'departed_at'])
            ->map(function ($row) {
                return [
                    'staffId' => (int) $row->staff_id,
                    'arrivedAt' => $row->arrived_at,
                    'departedAt' => $row->departed_at,
                ];
            })
            ->values();

        return response()->json($records);
    }
}
