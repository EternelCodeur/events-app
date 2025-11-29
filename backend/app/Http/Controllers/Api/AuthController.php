<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Entreprise;
use Firebase\JWT\JWT;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);
        $user = User::where('email', $credentials['email'])->first();
        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'Identifiants invalides'], 401);
        }

        // Vérification d'entreprise active pour les rôles non-superadmin
        if (in_array($user->role ?? 'admin', ['admin', 'hotesse', 'utilisateur'], true)) {
            if (!$user->entreprise_id) {
                return response()->json(['message' => "Aucune entreprise associée à ce compte"], 403);
            }
            $entreprise = Entreprise::find($user->entreprise_id);
            if (!$entreprise || $entreprise->status !== 'active') {
                return response()->json(['message' => "L'entreprise est inactive"], 403);
            }
        }

        $token = $this->issueToken($user->id, $user->role ?? null);
        return $this->respondWithToken($token, $user);
    }

    public function me(Request $request)
    {
        /** @var User $u */
        $u = $request->user();
        return response()->json($this->transformUser($u));
    }

    public function logout()
    {
        // Stateless JWT: rien à invalider côté serveur par défaut
        return response()->json(['message' => 'Déconnecté']);
    }

    public function refresh()
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        $token = $this->issueToken($user->id, $user->role ?? null);
        return $this->respondWithToken($token, $user);
    }

    protected function respondWithToken(string $token, User $user)
    {
        $ttlSeconds = (int) (config('jwt.ttl', 60) * 60);
        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => $ttlSeconds,
            'user' => $this->transformUser($user),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function transformUser(User $user): array
    {
        $entrepriseName = null;
        $entrepriseId = null;
        $role = (string) ($user->role ?? 'admin');
        if (in_array($role, ['admin', 'hotesse', 'utilisateur'], true) && $user->entreprise_id) {
            $entreprise = Entreprise::find($user->entreprise_id);
            if ($entreprise) {
                $entrepriseName = (string) $entreprise->name;
                $entrepriseId = (string) $entreprise->id;
            }
        }
        return [
            'id' => (string) $user->id,
            'name' => (string) ($user->name ?? ''),
            'email' => (string) ($user->email ?? ''),
            'role' => $role,
            'entrepriseId' => $entrepriseId,
            'entrepriseName' => $entrepriseName,
        ];
    }

    private function issueToken(int|string $userId, ?string $role = null): string
    {
        $ttlSeconds = (int) (config('jwt.ttl', 60) * 60);
        $now = time();
        $payload = [
            'iss' => config('app.url', url('/')),
            'iat' => $now,
            'nbf' => $now,
            'exp' => $now + $ttlSeconds,
            'sub' => $userId,
            'role' => $role,
        ];
        $secret = $this->getSecret();
        return JWT::encode($payload, $secret, 'HS256');
    }

    private function getSecret(): string
    {
        $env = (string) env('JWT_SECRET', '');
        if ($env !== '') return $env;
        $appKey = (string) config('app.key');
        if (str_starts_with($appKey, 'base64:')) {
            return (string) base64_decode(substr($appKey, 7));
        }
        return $appKey;
    }
}
