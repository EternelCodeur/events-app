<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\DB;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function () {
    $nowDate = date('Y-m-d');
    $nowTime = date('H:i');
    DB::table('events')
        ->where('status', 'confirme')
        ->whereDate('date', '=', $nowDate)
        ->where(function ($q) use ($nowTime) {
            $q->where(function ($qq) use ($nowTime) {
                $qq->whereNotNull('start_time')
                   ->whereNotNull('end_time')
                   ->where('start_time', '<=', $nowTime)
                   ->where('end_time', '>', $nowTime);
            })->orWhere(function ($qq) use ($nowTime) {
                $qq->whereNull('start_time')
                   ->whereNotNull('end_time')
                   ->where('end_time', '>', $nowTime);
            })->orWhere(function ($qq) use ($nowTime) {
                $qq->whereNotNull('start_time')
                   ->whereNull('end_time')
                   ->where('start_time', '<=', $nowTime);
            })->orWhere(function ($qq) {
                $qq->whereNull('start_time')
                   ->whereNull('end_time');
            });
        })
        ->update([
            'status' => 'en_cours',
            'updated_at' => now(),
        ]);
    DB::table('events')
        ->whereIn('status', ['confirme', 'en_cours'])
        ->whereDate('date', '<', $nowDate)
        ->update([
            'status' => 'termine',
            'updated_at' => now(),
        ]);
    DB::table('events')
        ->whereIn('status', ['confirme', 'en_cours'])
        ->whereDate('date', '=', $nowDate)
        ->whereNotNull('end_time')
        ->where('end_time', '<=', $nowTime)
        ->update([
            'status' => 'termine',
            'updated_at' => now(),
        ]);
    DB::table('events')
        ->where('status', 'en_attente')
        ->whereDate('date', '<', $nowDate)
        ->update([
            'status' => 'echoue',
            'updated_at' => now(),
        ]);
    DB::table('events')
        ->where('status', 'en_attente')
        ->whereDate('date', '=', $nowDate)
        ->whereNotNull('end_time')
        ->where('end_time', '<=', $nowTime)
        ->update([
            'status' => 'echoue',
            'updated_at' => now(),
        ]);
    $venueIds = DB::table('venues')->pluck('id');
    foreach ($venueIds as $vid) {
        $nowOngoing = DB::table('events')
            ->where('venue_id', $vid)
            ->whereDate('date', '=', $nowDate)
            ->where(function ($s) use ($nowTime) {
                $s->where('status', 'en_cours')
                  ->orWhere(function ($qq) use ($nowTime) {
                      $qq->where('status', 'confirme')
                         ->where(function ($q) use ($nowTime) {
                             $q->whereNull('start_time')->orWhere('start_time', '<=', $nowTime);
                         })
                         ->where(function ($q) use ($nowTime) {
                             $q->whereNull('end_time')->orWhere('end_time', '>', $nowTime);
                         });
                  });
            })
            ->exists();
        $hasUpcoming = DB::table('events')
            ->where('venue_id', $vid)
            ->whereIn('status', ['en_attente', 'confirme'])
            ->where(function ($q) use ($nowDate, $nowTime) {
                $q->where('date', '>', $nowDate)
                  ->orWhere(function ($qq) use ($nowDate, $nowTime) {
                      $qq->where('date', '=', $nowDate)
                         ->where(function ($qq2) use ($nowTime) {
                             $qq2->whereNull('start_time')->orWhere('start_time', '>', $nowTime);
                         });
                  });
            })
            ->exists();
        $newStatus = $nowOngoing ? 'occupe' : ($hasUpcoming ? 'en_attente' : 'vide');
        DB::table('venues')->where('id', $vid)->update([
            'status' => $newStatus,
            'updated_at' => now(),
        ]);
    }
    $activeIds = DB::table('event_staff_assignments as esa')
        ->join('events as ev', 'ev.id', '=', 'esa.event_id')
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
        ->pluck('esa.staff_id');

    if ($activeIds->count() > 0) {
        DB::table('staff')->whereIn('id', $activeIds->all())->update([
            'status' => 'active',
            'updated_at' => now(),
        ]);
        DB::table('staff')->whereNotIn('id', $activeIds->all())->update([
            'status' => 'inactive',
            'updated_at' => now(),
        ]);
    } else {
        DB::table('staff')->update([
            'status' => 'inactive',
            'updated_at' => now(),
        ]);
    }
})->everyMinute();

Schedule::call(function () {
    $wa = app(\App\Services\WhatsAppService::class);
    if (!$wa->enabled()) {
        return;
    }
    $nowTime = date('H:i');
    $sendHour = env('WHATSAPP_REMINDER_HOUR', '09:00');
    if ($nowTime < $sendHour) {
        return;
    }
    $tomorrowDate = date('Y-m-d', strtotime('+1 day'));
    if (!\Illuminate\Support\Facades\Schema::hasTable('event_notifications')) {
        return;
    }
    $events = DB::table('events')
        ->where('status', 'confirme')
        ->whereDate('date', '=', $tomorrowDate)
        ->get();
    foreach ($events as $ev) {
        $venueName = $ev->venue_id ? (DB::table('venues')->where('id', $ev->venue_id)->value('name') ?? '') : '';
        $start = $ev->start_time ? substr((string) $ev->start_time, 0, 5) : null;
        $end = $ev->end_time ? substr((string) $ev->end_time, 0, 5) : null;
        $timePart = $start && $end ? ($start . ' - ' . $end) : ($start ?: ($end ? ("jusqu'à " . $end) : ''));
        $parts = array_filter([(string) $ev->title, $timePart, $venueName], function ($v) {
            return $v !== null && $v !== '';
        });
        $body = 'Rappel: événement demain ' . $tomorrowDate . ' — ' . implode(' | ', $parts) . '.';
        $phones = DB::table('event_staff_assignments as esa')
            ->join('staff as s', 's.id', '=', 'esa.staff_id')
            ->where('esa.event_id', $ev->id)
            ->whereNotNull('s.phone')
            ->pluck('s.phone')
            ->all();
        $entreprisePhone = DB::table('entreprises')->where('id', $ev->entreprise_id)->value('phone');
        if ($entreprisePhone) {
            $phones[] = $entreprisePhone;
        }
        $normalizedMap = [];
        foreach ($phones as $p) {
            $n = $wa->normalize((string) $p);
            if ($n) {
                $normalizedMap[$n] = true;
            }
        }
        $recipients = array_keys($normalizedMap);
        foreach ($recipients as $to) {
            $already = DB::table('event_notifications')
                ->where('event_id', $ev->id)
                ->where('channel', 'whatsapp')
                ->where('category', 'jminus1')
                ->where('recipient', $to)
                ->exists();
            if ($already) {
                continue;
            }
            $res = $wa->sendText($to, $body);
            $ok = is_array($res) && ($res['ok'] ?? false);
            DB::table('event_notifications')->insert([
                'entreprise_id' => $ev->entreprise_id,
                'event_id' => $ev->id,
                'channel' => 'whatsapp',
                'category' => 'jminus1',
                'recipient' => $to,
                'message' => $body,
                'status' => $ok ? 'sent' : 'failed',
                'meta' => json_encode($res),
                'sent_at' => $ok ? now() : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
})->hourly();
