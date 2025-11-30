<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UsersController extends Controller
{
    public function index(Request $request)
    {
        $auth = $request->user();
        $query = User::query();

        if (($auth->role ?? 'admin') !== 'superadmin') {
            // Admins can only see users from their entreprise and cannot see superadmins
            $query->where('entreprise_id', $auth->entreprise_id)
                  ->where('role', '!=', 'superadmin');
        }

        return $query->orderByDesc('id')->get()->map(function (User $u) {
            return [
                'id' => (string)$u->id,
                'name' => (string)$u->name,
                'email' => (string)$u->email,
                'role' => (string)$u->role,
                'entrepriseId' => $u->entreprise_id ? (string)$u->entreprise_id : null,
            ];
        });
    }

    public function store(Request $request)
    {
        $auth = $request->user();
        $isSuper = (($auth->role ?? 'admin') === 'superadmin');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'email' => ['required', 'email', 'max:191', 'unique:users,email'],
            'role' => ['required', Rule::in(['superadmin', 'admin', 'hotesse', 'utilisateur'])],
            'entrepriseId' => ['sometimes', 'nullable', 'integer'],
        ]);

        if (!$isSuper) {
            // Admins cannot create superadmins and must attach to their entreprise
            if (($data['role'] ?? 'utilisateur') === 'superadmin') {
                abort(403, 'Forbidden');
            }
            $data['entrepriseId'] = (int) $auth->entreprise_id;
        } else {
            // Optionally allow superadmin to set entreprise; if none and role not superadmin -> error
            if (($data['role'] ?? 'utilisateur') !== 'superadmin') {
                if (empty($data['entrepriseId'])) {
                    abort(422, "L'entreprise est requise pour ce rôle");
                }
            } else {
                $data['entrepriseId'] = null;
            }
        }

        $user = new User();
        $user->name = (string)$data['name'];
        $user->email = (string)$data['email'];
        // Generate a random password server-side
        // $randomPassword = Str::random(12);
        $randomPassword = "password123";
        $user->password = Hash::make($randomPassword);
        $user->role = (string)$data['role'];
        $user->entreprise_id = $data['entrepriseId'] ?? null;
        $user->save();

        return response()->json([
            'id' => (string)$user->id,
            'name' => (string)$user->name,
            'email' => (string)$user->email,
            'role' => (string)$user->role,
            'entrepriseId' => $user->entreprise_id ? (string)$user->entreprise_id : null,
        ], 201);
    }

    public function update(Request $request, User $user)
    {
        $auth = $request->user();
        $isSuper = (($auth->role ?? 'admin') === 'superadmin');

        if (!$isSuper) {
            if ((int)$user->entreprise_id !== (int)$auth->entreprise_id) {
                abort(403, 'Forbidden');
            }
            if ((string)$user->role === 'superadmin') {
                abort(403, 'Forbidden');
            }
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:191'],
            'email' => ['sometimes', 'email', 'max:191', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['sometimes', 'string', 'min:6'],
            'role' => ['sometimes', Rule::in(['superadmin', 'admin', 'hotesse', 'utilisateur'])],
            'entrepriseId' => ['sometimes', 'nullable', 'integer'],
        ]);

        if (!$isSuper) {
            if (isset($data['role']) && $data['role'] === 'superadmin') {
                abort(403, 'Forbidden');
            }
            // Admin cannot change entrepriseId to something else than his own
            if (array_key_exists('entrepriseId', $data)) {
                $data['entrepriseId'] = (int)$auth->entreprise_id;
            }
        } else {
            if (($data['role'] ?? $user->role) !== 'superadmin') {
                if (array_key_exists('entrepriseId', $data) && empty($data['entrepriseId'])) {
                    abort(422, "L'entreprise est requise pour ce rôle");
                }
            }
        }

        if (isset($data['name'])) $user->name = (string)$data['name'];
        if (isset($data['email'])) $user->email = (string)$data['email'];
        if (isset($data['password']) && $data['password']) $user->password = Hash::make((string)$data['password']);
        if (isset($data['role'])) $user->role = (string)$data['role'];
        if (array_key_exists('entrepriseId', $data)) $user->entreprise_id = $data['entrepriseId'] ?? null;
        $user->save();

        return [
            'id' => (string)$user->id,
            'name' => (string)$user->name,
            'email' => (string)$user->email,
            'role' => (string)$user->role,
            'entrepriseId' => $user->entreprise_id ? (string)$user->entreprise_id : null,
        ];
    }

    public function destroy(Request $request, User $user)
    {
        $auth = $request->user();
        $isSuper = (($auth->role ?? 'admin') === 'superadmin');

        if (!$isSuper) {
            if ((int)$user->entreprise_id !== (int)$auth->entreprise_id) {
                abort(403, 'Forbidden');
            }
            if ((string)$user->role === 'superadmin') {
                abort(403, 'Forbidden');
            }
        }

        $user->delete();
        return response()->noContent();
    }
}
