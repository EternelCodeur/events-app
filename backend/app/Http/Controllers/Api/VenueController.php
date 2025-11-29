<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VenueResource;
use App\Models\Venue;
use Illuminate\Http\Request;

class VenueController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Venue::query();
        if (($user->role ?? 'admin') !== 'superadmin') {
            $query->where('entreprise_id', $user->entreprise_id);
        }
        return VenueResource::collection($query->latest()->get());
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

        return new VenueResource($venue);
    }

    public function destroy(Request $request, Venue $venue)
    {
        $user = $request->user();
        if (($user->role ?? 'admin') !== 'superadmin' && (int)$venue->entreprise_id !== (int)$user->entreprise_id) {
            abort(403, 'Forbidden');
        }

        $venue->delete();
        return response()->noContent();
    }
}
