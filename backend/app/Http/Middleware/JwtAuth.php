<?php

namespace App\Http\Middleware;

use App\Services\JwtService;
use App\Models\User;
use App\Models\Company;
use Closure;
use Illuminate\Http\Request;

class JwtAuth
{
    public function handle(Request $request, Closure $next)
    {
        $token = (string) $request->cookies->get('access_token', '');
        if (!$token) {
            $auth = (string) $request->header('Authorization', '');
            if (str_starts_with($auth, 'Bearer ')) {
                $token = substr($auth, 7);
            }
        }
        if (!$token) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        try {
            $jwt = app(JwtService::class);
            $payload = $jwt->decode($token);
            if (($payload['type'] ?? '') !== 'access') {
                return response()->json(['message' => 'Invalid token'], 401);
            }
            $userId = (string) ($payload['sub'] ?? '');
            $user = $userId ? User::find($userId) : null;
            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }
            // Vérifier statut de l'entreprise si liée (tous rôles)
            if (!empty($user->company_id)) {
                $company = Company::find($user->company_id);
                if ($company && ($company->status ?? 'active') !== 'active') {
                    return response()->json(['message' => "L'entreprise est inactive"], 403);
                }
            }

            $request->attributes->set('auth_user', $user);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        return $next($request);
    }
}
