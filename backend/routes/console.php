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
        ->where('ev.status', 'en_cours')
        ->whereDate('ev.date', '=', $nowDate)
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
