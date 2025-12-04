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
            // Pour l'endpoint de refresh, on autorise un token expiré: on vérifie uniquement la signature
            if ($request->is('api/auth/refresh')) {
                $payload = $this->verifySignatureAndDecodePayload($token);
                if (!$payload || empty($payload['sub'])) {
                    abort(401, 'Token invalide');
                }
                $user = \App\Models\User::find($payload['sub']);
                if (!$user) {
                    abort(401, 'Utilisateur introuvable');
                }
                Auth::setUser($user);
                $request->setUserResolver(fn () => $user);
            } else {
                abort(401, 'Token invalide');
            }
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

    /**
     * Vérifie la signature HMAC SHA-256 du JWT et retourne le payload sans valider 'exp'.
     * @return array<string, mixed>|null
     */
    private function verifySignatureAndDecodePayload(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        [$h, $p, $sig] = $parts;
        $secret = $this->getSecret();
        $expected = $this->base64UrlEncode(hash_hmac('sha256', $h . '.' . $p, $secret, true));
        if (!hash_equals($expected, $sig)) {
            return null;
        }
        $json = $this->base64UrlDecode($p);
        $data = json_decode($json, true);
        return is_array($data) ? $data : null;
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/')) ?: '';
    }
}
