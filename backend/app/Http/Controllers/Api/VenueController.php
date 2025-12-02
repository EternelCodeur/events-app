<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VenueResource;
use App\Models\Venue;
use App\Models\Event;
use Illuminate\Http\Request;
use App\Models\Entreprise;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class VenueController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Venue::query();
        if (($user->role ?? 'admin') !== 'superadmin') {
            $query->where('entreprise_id', $user->entreprise_id);
        }
        $venues = $query->latest()->get();

        // Time-aware status recalculation so rooms auto switch when events pass
        $today = date('Y-m-d');
        $now = date('H:i');
        foreach ($venues as $venue) {
            $nowOngoing = Event::where('venue_id', $venue->id)
                ->whereDate('date', '=', $today)
                ->where(function ($s) use ($now) {
                    $s->where('status', 'en_cours')
                      ->orWhere(function ($qq) use ($now) {
                          $qq->where('status', 'confirme')
                             ->where(function ($q) use ($now) {
                                 $q->whereNull('start_time')->orWhere('start_time', '<=', $now);
                             })
                             ->where(function ($q) use ($now) {
                                 $q->whereNull('end_time')->orWhere('end_time', '>', $now);
                             });
                      });
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
            $newStatus = $nowOngoing ? 'occupe' : ($hasUpcoming ? 'en_attente' : 'vide');
            if ($venue->status !== $newStatus) {
                $venue->status = $newStatus;
                $venue->save();
            }
        }

        return VenueResource::collection($venues);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'capacity' => ['required', 'integer', 'min:1'],
            'location' => ['required', 'string', 'max:191'],
            'area' => ['required', 'in:interieur,exterieur,les_deux'],
        ]);

        $entrepriseId = ($user->role ?? 'admin') === 'superadmin'
            ? ($request->input('entrepriseId') ?: null)
            : $user->entreprise_id;

        if (!$entrepriseId) {
            abort(422, 'Entreprise non définie');
        }

        // Prevent duplicate by name within entreprise (case-insensitive)
        $dupExists = Venue::query()
            ->where('entreprise_id', $entrepriseId)
            ->whereRaw('LOWER(name) = ?', [strtolower($data['name'])])
            ->exists();
        if ($dupExists) {
            abort(422, 'Cette salle existe déjà');
        }

        $venue = Venue::create([
            'name' => $data['name'],
            'capacity' => $data['capacity'],
            'location' => $data['location'],
            'area' => $data['area'],
            'status' => 'vide',
            'entreprise_id' => $entrepriseId,
        ]);

        // Create slugged folder for the venue under the entreprise directory
        $entreprise = Entreprise::findOrFail($entrepriseId);
        $entrepriseSlug = (string) $entreprise->slug;
        $base = 'entreprises/' . $entrepriseSlug . '/venues/';
        $venueSlug = Str::slug((string) $data['name'], '-');
        $newPath = $base . $venueSlug;
        if (!Storage::disk('local')->exists($newPath)) {
            Storage::disk('local')->makeDirectory($newPath);
        }
        $venue->folder_path = $newPath;
        $venue->save();

        return new VenueResource($venue);
    }

    public function show(Request $request, Venue $venue)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$venue->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }
        return new VenueResource($venue);
    }

    public function update(Request $request, Venue $venue)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$venue->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'capacity' => ['sometimes', 'integer', 'min:1'],
            'location' => ['sometimes', 'string', 'max:191'],
            'area' => ['sometimes', 'in:interieur,exterieur,les_deux'],
        ]);

        $oldName = $venue->getOriginal('name');

        // Compute new values without persisting yet
        $newName = array_key_exists('name', $data) ? $data['name'] : $venue->name;

        // Prevent duplicate by name (case-insensitive) within entreprise
        $dupExists = Venue::query()
            ->where('entreprise_id', $venue->entreprise_id)
            ->where('id', '<>', $venue->id)
            ->whereRaw('LOWER(name) = ?', [strtolower($newName)])
            ->exists();
        if ($dupExists) {
            abort(422, 'Cette salle existe déjà');
        }

        $venue->fill($data);
        $venue->save();

        // If name changed, move/rename the folder accordingly
        if ($oldName !== $venue->name) {
            $entreprise = Entreprise::findOrFail($venue->entreprise_id);
            $entrepriseSlug = (string) $entreprise->slug;
            $base = 'entreprises/' . $entrepriseSlug . '/venues/';
            $oldSlugPath = $base . Str::slug((string) $oldName, '-');
            $oldRawPath = $base . $oldName;
            $newPath = $base . Str::slug((string) $venue->name, '-');
            if (Storage::disk('local')->exists($oldSlugPath)) {
                Storage::disk('local')->move($oldSlugPath, $newPath);
            } elseif (Storage::disk('local')->exists($oldRawPath)) {
                Storage::disk('local')->move($oldRawPath, $newPath);
            } elseif ($venue->folder_path && Storage::disk('local')->exists($venue->folder_path)) {
                Storage::disk('local')->move($venue->folder_path, $newPath);
            } else {
                Storage::disk('local')->makeDirectory($newPath);
            }
            $venue->folder_path = $newPath;
            $venue->save();
        }

        return new VenueResource($venue);
    }

    public function destroy(Request $request, Venue $venue)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$venue->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        $paths = [];
        if (!empty($venue->folder_path)) {
            $paths[] = (string) $venue->folder_path;
        }
        $entreprise = Entreprise::find($venue->entreprise_id);
        if ($entreprise) {
            $base = 'entreprises/' . (string) $entreprise->slug . '/venues/';
            $slugPath = $base . Str::slug((string) $venue->name, '-');
            $rawPath = $base . $venue->name;
            foreach ([$slugPath, $rawPath] as $p) {
                if ($p && !in_array($p, $paths, true)) $paths[] = $p;
            }
        }
        foreach ($paths as $p) {
            if (Storage::disk('local')->exists($p)) {
                Storage::disk('local')->deleteDirectory($p);
            }
        }

        $venue->delete();
        return response()->noContent();
    }
}
