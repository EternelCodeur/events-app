<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\Entreprise;
use App\Models\Venue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Event::query();
        if (($user->role ?? 'admin') !== 'superadmin') {
            $query->where('entreprise_id', $user->entreprise_id);
        } else {
            if ($request->filled('entrepriseId')) {
                $query->where('entreprise_id', (int) $request->integer('entrepriseId'));
            }
        }
        $events = $query->latest()->get();
        $today = date('Y-m-d');
        $now = date('H:i');
        foreach ($events as $ev) {
            $endStr = $ev->end_time ? substr((string) $ev->end_time, 0, 5) : null;
            $startStr = $ev->start_time ? substr((string) $ev->start_time, 0, 5) : null;
            $shouldFailed = $ev->status === 'en_attente' && ((((string)$ev->date) < $today) || (((string)$ev->date) === $today && $endStr && $endStr <= $now));
            if ($shouldFailed) {
                $ev->status = 'echoue';
                $ev->save();
                continue;
            }
            $shouldTerminate = in_array($ev->status, ['confirme', 'en_cours'], true)
                && (((string) $ev->date) < $today || (((string) $ev->date) === $today && $endStr && $endStr <= $now));
            if ($shouldTerminate) {
                $ev->status = 'termine';
                $ev->save();
                continue;
            }
            $shouldOngoing = $ev->status === 'confirme'
                && ((string) $ev->date) === $today
                && (
                    ($startStr && $endStr && $startStr <= $now && $endStr > $now)
                    || (is_null($ev->start_time) && is_null($ev->end_time))
                    || (is_null($ev->start_time) && $endStr && $endStr > $now)
                    || ($startStr && is_null($ev->end_time) && $startStr <= $now)
                );
            if ($shouldOngoing) {
                $ev->status = 'en_cours';
                $ev->save();
            }
        }
        return EventResource::collection($events);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        // Normalize time fields before validation
        $st = $request->input('startTime');
        if ($st === '') { $request->merge(['startTime' => null]); }
        elseif (is_string($st) && preg_match('/^\d{2}:\d{2}:\d{2}$/', $st)) { $request->merge(['startTime' => substr($st, 0, 5)]); }
        $et = $request->input('endTime');
        if ($et === '') { $request->merge(['endTime' => null]); }
        elseif (is_string($et) && preg_match('/^\d{2}:\d{2}:\d{2}$/', $et)) { $request->merge(['endTime' => substr($et, 0, 5)]); }
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'date' => ['required', 'date'],
            'startTime' => ['nullable', 'date_format:H:i'],
            'endTime' => ['nullable', 'date_format:H:i'],
            'venueId' => ['nullable', 'integer', 'exists:venues,id'],
            'guests' => ['nullable', 'integer', 'min:0'],
            'budget' => ['nullable', 'string', 'max:191'],
            'eventType' => ['nullable', 'in:mariage,celebration_religieuse,cocktail'],
            'areaChoice' => ['nullable', 'in:interieur,exterieur,les_deux'],
            'mariageInteriorSubtype' => ['nullable', 'in:civil,coutumier'],
            'mariageExteriorSubtype' => ['nullable', 'in:civil,coutumier'],
            'status' => ['sometimes', 'nullable', 'in:en_attente,confirme,annuler,en_cours,termine,echoue'],
            'entrepriseId' => ['sometimes', 'nullable', 'integer', 'exists:entreprises,id'],
        ]);

        // Resolve entreprise id
        if (($user->role ?? 'admin') === 'superadmin') {
            $entrepriseId = $data['entrepriseId'] ?? null;
            if (!$entrepriseId && !empty($data['venueId'])) {
                $venue = Venue::find($data['venueId']);
                $entrepriseId = $venue?->entreprise_id;
            }
        } else {
            $entrepriseId = $user->entreprise_id;
        }
        if (!$entrepriseId) {
            abort(422, 'Entreprise non définie');
        }

        // Validate venue belongs to entreprise if provided
        if (!empty($data['venueId'])) {
            $venue = Venue::find($data['venueId']);
            if (!$venue || (int) $venue->entreprise_id !== (int) $entrepriseId) {
                abort(422, 'La salle sélectionnée ne correspond pas à votre entreprise');
            }
            // Conflict: same venue already booked on the same date & overlapping time slot
            $start = $data['startTime'] ?? null;
            $end = $data['endTime'] ?? null;
            $conflictQuery = Event::where('venue_id', $data['venueId'])
                ->whereDate('date', $data['date'])
                ->whereIn('status', ['en_attente', 'confirme']);
            if ($start && $end) {
                $conflictQuery->where(function ($q) use ($start, $end) {
                    // existing all-day OR overlapping intervals (start < existing.end AND existing.start < end)
                    $q->whereNull('start_time')
                      ->orWhereNull('end_time')
                      ->orWhere(function ($qq) use ($start, $end) {
                          $qq->where('start_time', '<', $end)
                             ->where('end_time', '>', $start);
                      });
                });
            } else {
                // if no start/end provided, only conflicting with all-day events on that date
                $conflictQuery->where(function ($q) {
                    $q->whereNull('start_time')->orWhereNull('end_time');
                });
            }
            $conflict = $conflictQuery->exists();
            if ($conflict) {
                abort(422, 'La salle est déjà occupée à cette date');
            }
        }

        // Prevent duplicate by title within entreprise (case-insensitive)
        $dupExists = Event::where('entreprise_id', $entrepriseId)
            ->whereRaw('LOWER(title) = ?', [strtolower($data['title'])])
            ->exists();
        if ($dupExists) {
            abort(422, 'Cet événement existe déjà');
        }

        $event = Event::create([
            'entreprise_id' => $entrepriseId,
            'venue_id' => $data['venueId'] ?? null,
            'title' => $data['title'],
            'date' => $data['date'],
            'start_time' => $data['startTime'] ?? null,
            'end_time' => $data['endTime'] ?? null,
            'guests' => $data['guests'] ?? 0,
            'budget' => $data['budget'] ?? null,
            'status' => $data['status'] ?? 'en_attente',
            'event_type' => $data['eventType'] ?? null,
            'area_choice' => $data['areaChoice'] ?? null,
            'mariage_interior_subtype' => $data['mariageInteriorSubtype'] ?? null,
            'mariage_exterior_subtype' => $data['mariageExteriorSubtype'] ?? null,
        ]);

        // Side effect: create directory for the event under entreprise slug
        $entreprise = Entreprise::findOrFail($entrepriseId);
        $slug = (string) $entreprise->slug;
        $eventSlug = Str::slug((string) $event->title, '-');
        Storage::disk('local')->makeDirectory('entreprises/' . $slug . '/events/' . $eventSlug);

        // Persist folder path on the event
        $event->folder_path = 'entreprises/' . $slug . '/events/' . $eventSlug;
        $event->save();

        // Update venue status according to assigned events (time-aware)
        if ($event->venue_id) {
            $venue = Venue::find($event->venue_id);
            if ($venue) {
                $today = date('Y-m-d');
                $now = date('H:i');
                $nowConfirmed = Event::where('venue_id', $venue->id)
                    ->where('status', 'confirme')
                    ->whereDate('date', '=', $today)
                    ->where(function ($q) use ($now) {
                        $q->whereNull('start_time')->orWhere('start_time', '<=', $now);
                    })
                    ->where(function ($q) use ($now) {
                        $q->whereNull('end_time')->orWhere('end_time', '>', $now);
                    })
                    ->exists();
                $hasUpcoming = Event::where('venue_id', $venue->id)
                    ->whereIn('status', ['en_attente', 'confirme'])
                    ->where(function ($q) use ($today, $now) {
                        $q->where('date', '>', $today)
                          ->orWhere(function ($qq) use ($today, $now) {
                              $qq->where('date', '=', $today)
                                 ->where(function ($qq2) use ($now) {
                                     $qq2->whereNull('start_time')->orWhere('start_time', '>', $now);
                                 });
                          });
                    })
                    ->exists();
                $venue->status = $nowConfirmed ? 'occupe' : ($hasUpcoming ? 'en_attente' : 'vide');
                $venue->save();
            }
        }

        $staffIds = DB::table('event_staff_assignments')->where('event_id', $event->id)->pluck('staff_id');
        $nowDate = date('Y-m-d');
        $nowTime = date('H:i');
        foreach ($staffIds as $sid) {
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

        return new EventResource($event);
    }

    public function show(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        return new EventResource($event);
    }

    public function update(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        // Normalize time fields before validation
        $st = $request->input('startTime');
        if ($st === '') { $request->merge(['startTime' => null]); }
        elseif (is_string($st) && preg_match('/^\d{2}:\d{2}:\d{2}$/', $st)) { $request->merge(['startTime' => substr($st, 0, 5)]); }
        $et = $request->input('endTime');
        if ($et === '') { $request->merge(['endTime' => null]); }
        elseif (is_string($et) && preg_match('/^\d{2}:\d{2}:\d{2}$/', $et)) { $request->merge(['endTime' => substr($et, 0, 5)]); }

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'date' => ['sometimes', 'date'],
            'startTime' => ['sometimes', 'nullable', 'date_format:H:i'],
            'endTime' => ['sometimes', 'nullable', 'date_format:H:i'],
            'venueId' => ['sometimes', 'nullable', 'integer', 'exists:venues,id'],
            'guests' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'budget' => ['sometimes', 'nullable', 'string', 'max:191'],
            'eventType' => ['sometimes', 'nullable', 'in:mariage,celebration_religieuse,cocktail'],
            'areaChoice' => ['sometimes', 'nullable', 'in:interieur,exterieur,les_deux'],
            'mariageInteriorSubtype' => ['sometimes', 'nullable', 'in:civil,coutumier'],
            'mariageExteriorSubtype' => ['sometimes', 'nullable', 'in:civil,coutumier'],
            'status' => ['sometimes', 'nullable', 'in:en_attente,confirme,annuler,en_cours,termine,echoue'],
        ]);

        $oldTitle = $event->getOriginal('title');
        $oldVenueId = $event->getOriginal('venue_id');
        $oldStatus = $event->getOriginal('status');

        if (array_key_exists('venueId', $data)) {
            if (!empty($data['venueId'])) {
                $venue = Venue::find($data['venueId']);
                if (!$venue || (int) $venue->entreprise_id !== (int) $event->entreprise_id) {
                    abort(422, 'La salle sélectionnée ne correspond pas à votre entreprise');
                }
                $event->venue_id = $data['venueId'];
            } else {
                $event->venue_id = null;
            }
        }

        if (array_key_exists('title', $data)) $event->title = $data['title'];
        if (array_key_exists('date', $data)) $event->date = $data['date'];
        if (array_key_exists('startTime', $data)) $event->start_time = $data['startTime'];
        if (array_key_exists('endTime', $data)) $event->end_time = $data['endTime'];
        if (array_key_exists('guests', $data)) $event->guests = $data['guests'] ?? 0;
        if (array_key_exists('budget', $data)) $event->budget = $data['budget'];
        if (array_key_exists('eventType', $data)) $event->event_type = $data['eventType'];
        if (array_key_exists('areaChoice', $data)) $event->area_choice = $data['areaChoice'];
        if (array_key_exists('mariageInteriorSubtype', $data)) $event->mariage_interior_subtype = $data['mariageInteriorSubtype'];
        if (array_key_exists('mariageExteriorSubtype', $data)) $event->mariage_exterior_subtype = $data['mariageExteriorSubtype'];
        if (array_key_exists('status', $data)) $event->status = $data['status'];

        // Conflict check after applying changes (exclude current event)
        if ($event->venue_id && $event->date) {
            $conflictQuery = Event::where('venue_id', $event->venue_id)
                ->whereDate('date', $event->date)
                ->whereIn('status', ['en_attente', 'confirme'])
                ->where('id', '<>', $event->id);
            $start = $event->start_time;
            $end = $event->end_time;
            if ($start && $end) {
                $conflictQuery->where(function ($q) use ($start, $end) {
                    $q->whereNull('start_time')
                      ->orWhereNull('end_time')
                      ->orWhere(function ($qq) use ($start, $end) {
                          $qq->where('start_time', '<', $end)
                             ->where('end_time', '>', $start);
                      });
                });
            } else {
                $conflictQuery->where(function ($q) {
                    $q->whereNull('start_time')->orWhereNull('end_time');
                });
            }
            $conflict = $conflictQuery->exists();
            if ($conflict) {
                abort(422, 'La salle est déjà occupée à cette date');
            }
        }

        // Prevent duplicate by title (case-insensitive) within entreprise on update
        $dupExists = Event::where('entreprise_id', $event->entreprise_id)
            ->where('id', '<>', $event->id)
            ->whereRaw('LOWER(title) = ?', [strtolower($event->title)])
            ->exists();
        if ($dupExists) {
            abort(422, 'Cet événement existe déjà');
        }

        $event->save();

        if ($oldTitle !== $event->title) {
            $entreprise = Entreprise::findOrFail($event->entreprise_id);
            $slug = (string) $entreprise->slug;
            $base = 'entreprises/' . $slug . '/events/';
            $oldSlugPath = $base . Str::slug((string) $oldTitle, '-');
            $oldRawPath = $base . $oldTitle;
            $newPath = $base . Str::slug((string) $event->title, '-');
            if (Storage::disk('local')->exists($oldSlugPath)) {
                Storage::disk('local')->move($oldSlugPath, $newPath);
            } elseif (Storage::disk('local')->exists($oldRawPath)) {
                Storage::disk('local')->move($oldRawPath, $newPath);
            } elseif (Storage::disk('local')->exists($base . $event->id)) {
                Storage::disk('local')->move($base . $event->id, $newPath);
            } else {
                Storage::disk('local')->makeDirectory($newPath);
            }
            // Update folder path on the event
            $event->folder_path = $newPath;
            $event->save();
        }

        // Recalculate venue statuses if venue/status changed (time-aware)
        if ($oldVenueId !== $event->venue_id || $oldStatus !== $event->status) {
            // New/current venue
            if ($event->venue_id) {
                $venue = Venue::find($event->venue_id);
                if ($venue) {
                    $today = date('Y-m-d');
                    $now = date('H:i');
                    $nowConfirmed = Event::where('venue_id', $venue->id)
                        ->where('status', 'confirme')
                        ->whereDate('date', '=', $today)
                        ->where(function ($q) use ($now) {
                            $q->whereNull('start_time')->orWhere('start_time', '<=', $now);
                        })
                        ->where(function ($q) use ($now) {
                            $q->whereNull('end_time')->orWhere('end_time', '>', $now);
                        })
                        ->exists();
                    $hasUpcoming = Event::where('venue_id', $venue->id)
                        ->whereIn('status', ['en_attente', 'confirme'])
                        ->where(function ($q) use ($today, $now) {
                            $q->where('date', '>', $today)
                              ->orWhere(function ($qq) use ($today, $now) {
                                  $qq->where('date', '=', $today)
                                     ->where(function ($qq2) use ($now) {
                                         $qq2->whereNull('start_time')->orWhere('start_time', '>', $now);
                                     });
                              });
                        })
                        ->exists();
                    $venue->status = $nowConfirmed ? 'occupe' : ($hasUpcoming ? 'en_attente' : 'vide');
                    $venue->save();
                }
            }
            // Old venue (if changed)
            if ($oldVenueId && $oldVenueId !== $event->venue_id) {
                $oldVenue = Venue::find($oldVenueId);
                if ($oldVenue) {
                    $today = date('Y-m-d');
                    $now = date('H:i');
                    $nowConfirmed = Event::where('venue_id', $oldVenue->id)
                        ->where('status', 'confirme')
                        ->whereDate('date', '=', $today)
                        ->where(function ($q) use ($now) {
                            $q->whereNull('start_time')
                              ->orWhere('start_time', '<=', $now);
                        })
                        ->where(function ($q) use ($now) {
                            $q->whereNull('end_time')
                              ->orWhere('end_time', '>', $now);
                        })
                        ->exists();
                    $hasUpcoming = Event::where('venue_id', $oldVenue->id)
                        ->whereIn('status', ['en_attente', 'confirme'])
                        ->where(function ($q) use ($today, $now) {
                            $q->where('date', '>', $today)
                              ->orWhere(function ($qq) use ($today, $now) {
                                  $qq->where('date', '=', $today)
                                     ->where(function ($qq2) use ($now) {
                                         $qq2->whereNull('start_time')
                                             ->orWhere('start_time', '>', $now);
                                     });
                              });
                        })
                        ->exists();
                    $oldVenue->status = $nowConfirmed ? 'occupe' : ($hasUpcoming ? 'en_attente' : 'vide');
                    $oldVenue->save();
                }
            }
        }

        $assignedStaffIds = DB::table('event_staff_assignments')->where('event_id', $event->id)->pluck('staff_id');
        $nowDate = date('Y-m-d');
        $nowTime = date('H:i');
        foreach ($assignedStaffIds as $sid) {
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

        return new EventResource($event);
    }

    public function destroy(Request $request, Event $event)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$event->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        $entreprise = Entreprise::findOrFail($event->entreprise_id);
        $slug = (string) $entreprise->slug;
        $base = 'entreprises/' . $slug . '/events/';
        $slugPath = $base . Str::slug((string) $event->title, '-');
        if (!empty($event->folder_path)) {
            Storage::disk('local')->deleteDirectory($event->folder_path);
        }
        Storage::disk('local')->deleteDirectory($slugPath);
        Storage::disk('local')->deleteDirectory($base . $event->title);
        Storage::disk('local')->deleteDirectory($base . $event->id);

        $staffIds = DB::table('event_staff_assignments')->where('event_id', $event->id)->pluck('staff_id');

        // Recalculate venue status after deletion (time-aware)
        $venueId = $event->venue_id;
        $event->delete();
        if ($venueId) {
            $venue = Venue::find($venueId);
            if ($venue) {
                $today = date('Y-m-d');
                $now = date('H:i');
                $nowConfirmed = Event::where('venue_id', $venue->id)
                    ->where('status', 'confirme')
                    ->whereDate('date', '=', $today)
                    ->where(function ($q) use ($now) {
                        $q->whereNull('start_time')->orWhere('start_time', '<=', $now);
                    })
                    ->where(function ($q) use ($now) {
                        $q->whereNull('end_time')->orWhere('end_time', '>', $now);
                    })
                    ->exists();
                $hasUpcoming = Event::where('venue_id', $venue->id)
                    ->whereIn('status', ['en_attente', 'confirme'])
                    ->where(function ($q) use ($today, $now) {
                        $q->where('date', '>', $today)
                          ->orWhere(function ($qq) use ($today, $now) {
                              $qq->where('date', '=', $today)
                                 ->where(function ($qq2) use ($now) {
                                     $qq2->whereNull('start_time')->orWhere('start_time', '>', $now);
                                 });
                          });
                    })
                    ->exists();
                $venue->status = $nowConfirmed ? 'occupe' : ($hasUpcoming ? 'en_attente' : 'vide');
                $venue->save();
            }
        }
        $nowDate = date('Y-m-d');
        $nowTime = date('H:i');
        foreach ($staffIds as $sid) {
            $hasActive = DB::table('event_staff_assignments as esa')
                ->join('events as ev', 'ev.id', '=', 'esa.event_id')
                ->where('esa.staff_id', $sid)
                ->where('ev.status', 'confirme')
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
                })
                ->exists();
            DB::table('staff')->where('id', $sid)->update([
                'status' => $hasActive ? 'active' : 'inactive',
                'updated_at' => now(),
            ]);
        }

        return response()->noContent();
    }
}
