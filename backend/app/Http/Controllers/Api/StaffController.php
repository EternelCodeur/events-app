<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StaffResource;
use App\Models\Staff;
use App\Models\Entreprise;
use Illuminate\Http\Request;

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
