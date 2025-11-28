<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class JwtMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $auth = $request->header('Authorization', '');
        if (!str_starts_with($auth, 'Bearer ')) {
            abort(401, 'Token manquant');
        }
        $token = substr($auth, 7);
        if (!$token) {
            abort(401, 'Token invalide');
        }
        try {
            $secret = $this->getSecret();
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            $userId = $decoded->sub ?? null;
            if (!$userId) {
                abort(401, 'Token invalide');
            }
            $user = \App\Models\User::find($userId);
            if (!$user) {
                abort(401, 'Utilisateur introuvable');
            }
            Auth::setUser($user);
            $request->setUserResolver(fn () => $user);

            // Vérifier entreprise active pour les rôles non-superadmin
            $role = (string) ($user->role ?? 'admin');
            if (in_array($role, ['admin', 'hotesse', 'utilisateur'], true)) {
                if (!$user->entreprise_id) {
                    abort(403, "Aucune entreprise associée à ce compte");
                }
                $entreprise = \App\Models\Entreprise::find($user->entreprise_id);
                if (!$entreprise || $entreprise->status !== 'active') {
                    abort(403, "L'entreprise est inactive");
                }
            }
        } catch (\Throwable $e) {
            abort(401, 'Token invalide');
        }

        return $next($request);
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
