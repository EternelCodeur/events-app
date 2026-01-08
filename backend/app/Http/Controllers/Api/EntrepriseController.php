<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EntrepriseResource;
use App\Models\Entreprise;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EntrepriseController extends Controller
{
    public function index()
    {
        return EntrepriseResource::collection(Entreprise::query()->latest()->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:191',
                Rule::unique('entreprises', 'email'),
                Rule::unique('users', 'email'),
            ],
            'phone' => ['required', 'string', 'max:255'],
            'adminName' => ['required', 'string', 'max:255'],
        ]);

        $slugBase = Str::slug($data['name']);
        $slug = $slugBase;
        $i = 1;
        while (Entreprise::where('slug', $slug)->exists()) {
            $slug = $slugBase . '-' . $i++;
        }

        $entreprise = Entreprise::create([
            'name' => $data['name'],
            'slug' => $slug,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'status' => 'active',
        ]);

        if (!empty($data['email'])) {
            // Unicité déjà validée (entreprises et users)
            $user = User::create([
                'name' => $data['adminName'] ?? $data['name'],
                'email' => $data['email'],
                'password' => "password123",
                'entreprise_id' => $entreprise->id,
                'role' => 'admin',
            ]);
            $entreprise->admin_user_id = $user->id;
            $entreprise->save();
        }

        Storage::disk('public')->makeDirectory('entreprises/' . $slug);

        return new EntrepriseResource($entreprise->fresh(['adminUser']));
    }

    public function show(Entreprise $entreprise)
    {
        return new EntrepriseResource($entreprise->load(['adminUser']));
    }

    public function update(Request $request, Entreprise $entreprise)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'nullable',
                'email',
                'max:191',
                Rule::unique('entreprises', 'email')->ignore($entreprise->id),
                Rule::unique('users', 'email')->ignore(optional($entreprise->adminUser)->id),
            ],
            'phone' => ['sometimes', 'nullable', 'string', 'max:255'],
            'adminName' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);

        if (array_key_exists('name', $data)) {
            $entreprise->name = $data['name'];
        }
        if (array_key_exists('email', $data)) {
            $entreprise->email = $data['email'];
            if ($entreprise->admin_user_id) {
                $admin = $entreprise->adminUser;
                if ($admin && !empty($data['email'])) {
                    $admin->email = $data['email'];
                    $admin->save();
                }
            } elseif (!empty($data['email'])) {
                // Créer un nouvel admin pour cette entreprise (unicité déjà validée)
                $user = User::create([
                    'name' => $data['adminName'] ?? $entreprise->name,
                    'email' => $data['email'],
                    'password' => "password123",
                    'entreprise_id' => $entreprise->id,
                    'role' => 'admin',
                ]);
                $entreprise->admin_user_id = $user->id;
            }
        }
        if (array_key_exists('phone', $data)) {
            $entreprise->phone = $data['phone'];
        }
        if (array_key_exists('status', $data)) {
            $entreprise->status = $data['status'];
        }
        if (array_key_exists('adminName', $data) && $entreprise->admin_user_id) {
            $entreprise->adminUser->name = $data['adminName'] ?? $entreprise->adminUser->name;
            $entreprise->adminUser->save();
        }

        $entreprise->save();

        return new EntrepriseResource($entreprise->fresh(['adminUser']));
    }

    public function destroy(Entreprise $entreprise)
    {
        User::where('entreprise_id', $entreprise->id)->delete();
        $entreprise->delete();

        return response()->noContent();
    }
}

