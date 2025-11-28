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
