<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Venue;
use App\Models\Staff;
use App\Models\Provider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function metrics(Request $request)
    {
        $user = $request->user();
        $entrepriseId = null;
        if (($user->role ?? 'admin') !== 'superadmin') {
            $entrepriseId = (int) $user->entreprise_id;
        } else if ($request->filled('entrepriseId')) {
            $entrepriseId = (int) $request->integer('entrepriseId');
        }

        $today = date('Y-m-d');
        $now = date('H:i');

        $eventsQuery = Event::query();
        $venuesQuery = Venue::query();
        $staffQuery = Staff::query();

        if ($entrepriseId) {
            $eventsQuery->where('entreprise_id', $entrepriseId);
            $venuesQuery->where('entreprise_id', $entrepriseId);
            $staffQuery->where('entreprise_id', $entrepriseId);
        }

        // Upcoming events: status en_attente or confirme and date >= today (time-aware: today with start_time > now or no start_time)
        $upcomingCount = (clone $eventsQuery)
            ->whereIn('status', ['en_attente', 'confirme'])
            ->where(function ($q) use ($today, $now) {
                $q->whereDate('date', '>', $today)
                  ->orWhere(function ($qq) use ($today, $now) {
                      $qq->whereDate('date', '=', $today)
                         ->where(function ($qq2) use ($now) {
                             $qq2->whereNull('start_time')
                                 ->orWhere('start_time', '>', $now);
                         });
                  });
            })
            ->count();

        // Venues occupied count and total
        $venuesOccupiedCount = (clone $venuesQuery)->where('status', 'occupe')->count();
        $venuesTotal = (clone $venuesQuery)->count();

        // Staff active count
        $staffActiveCount = (clone $staffQuery)->where('status', 'active')->count();

        // Monthly revenue (current month): sum over events in month of max(budget - sum(provider.amount_cfa), 0)
        $monthStart = date('Y-m-01');
        $monthEnd = date('Y-m-t');
        $monthlyEvents = (clone $eventsQuery)
            ->whereBetween(DB::raw('DATE(date)'), [$monthStart, $monthEnd])
            ->whereIn('status', ['en_attente', 'confirme', 'en_cours', 'termine'])
            ->get(['id', 'budget']);

        $monthlyRevenueCfa = 0;
        if ($monthlyEvents->count() > 0) {
            $providerSums = Provider::whereIn('event_id', $monthlyEvents->pluck('id'))
                ->select('event_id', DB::raw('SUM(amount_cfa) as total_amount'))
                ->groupBy('event_id')
                ->pluck('total_amount', 'event_id');
            foreach ($monthlyEvents as $ev) {
                $budget = (int) preg_replace('/\D+/', '', (string) ($ev->budget ?? '0'));
                $prov = (int) ($providerSums[$ev->id] ?? 0);
                $remaining = max($budget - $prov, 0);
                $monthlyRevenueCfa += $remaining;
            }
        }

        return response()->json([
            'eventsUpcomingCount' => $upcomingCount,
            'venuesOccupiedCount' => $venuesOccupiedCount,
            'venuesTotal' => $venuesTotal,
            'staffActiveCount' => $staffActiveCount,
            'monthlyRevenueCfa' => $monthlyRevenueCfa,
        ]);
    }
}
