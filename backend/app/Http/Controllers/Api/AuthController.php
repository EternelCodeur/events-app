<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Company;
use App\Services\JwtService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Cookie;

class AuthController extends Controller
{
    private JwtService $jwt;

    public function __construct(JwtService $jwt)
    {
        $this->jwt = $jwt;
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        $emailLower = strtolower($data['email']);
        $user = User::where('email', $emailLower)->first();
        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Identifiants invalides'], 401);
        }

        // Vérifier l'état de l'entreprise liée (si existante) pour tous les rôles
        if (!empty($user->company_id)) {
            $company = Company::find($user->company_id);
            if ($company && ($company->status ?? 'active') !== 'active') {
                return response()->json(['message' => "L'entreprise est inactive"], 403);
            }
        }

        $remember = (bool)($data['remember'] ?? false);

        // TTLs (minutes)
        $accessTtlMinutes = $remember ? (14 * 24 * 60) : (24 * 60); // 2 semaines sinon 1 jour
        $refreshTtlMinutes = 30 * 24 * 60; // 1 mois

        $claims = [
            'sub' => (string) $user->id,
            'role' => $user->role ?? 'user',
            'email' => $user->email,
        ];

        $accessToken = $this->jwt->generate($claims, $accessTtlMinutes * 60, 'access');
        $refreshToken = $this->jwt->generate(['sub' => (string)$user->id], $refreshTtlMinutes * 60, 'refresh');

        $response = response()->json([
            'user' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role ?? 'user',
            ],
        ]);

        $secure = app()->environment('production');
        $response->headers->setCookie(
            Cookie::create('access_token')
                ->withValue($accessToken)
                ->withPath('/')
                ->withHttpOnly(true)
                ->withSecure($secure)
                ->withSameSite('lax')
                ->withExpires(time() + ($accessTtlMinutes * 60))
        );
        $response->headers->setCookie(
            Cookie::create('refresh_token')
                ->withValue($refreshToken)
                ->withPath('/')
                ->withHttpOnly(true)
                ->withSecure($secure)
                ->withSameSite('lax')
                ->withExpires(time() + ($refreshTtlMinutes * 60))
        );

        return $response;
    }

    public function me(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        return response()->json([
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role ?? 'user',
        ]);
    }

    public function refresh(Request $request)
    {
        $refresh = (string) $request->cookies->get('refresh_token', '');
        if (!$refresh) {
            return response()->json(['message' => 'No refresh token'], 401);
        }

        try {
            $payload = $this->jwt->decode($refresh);
            if (($payload['type'] ?? '') !== 'refresh') {
                return response()->json(['message' => 'Invalid token type'], 401);
            }
            $userId = (string) ($payload['sub'] ?? '');
            $user = $userId ? User::find($userId) : null;
            if (!$user) {
                return response()->json(['message' => 'User not found'], 401);
            }
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Invalid token'], 401);
        }

        // Après refresh, access token = 1 mois
        $accessTtlMinutes = 30 * 24 * 60;
        $claims = [
            'sub' => (string) $user->id,
            'role' => $user->role ?? 'user',
            'email' => $user->email,
        ];
        $accessToken = $this->jwt->generate($claims, $accessTtlMinutes * 60, 'access');

        $secure = app()->environment('production');
        $response = response()->json(['message' => 'refreshed']);
        $response->headers->setCookie(
            Cookie::create('access_token')
                ->withValue($accessToken)
                ->withPath('/')
                ->withHttpOnly(true)
                ->withSecure($secure)
                ->withSameSite('lax')
                ->withExpires(time() + ($accessTtlMinutes * 60))
        );

        return $response;
    }

    public function logout()
    {
        $secure = app()->environment('production');
        $expired = time() - 3600;
        $response = response()->noContent();
        $response->headers->setCookie(
            Cookie::create('access_token')->withValue('')->withPath('/')->withHttpOnly(true)->withSecure($secure)->withSameSite('lax')->withExpires($expired)
        );
        $response->headers->setCookie(
            Cookie::create('refresh_token')->withValue('')->withPath('/')->withHttpOnly(true)->withSecure($secure)->withSameSite('lax')->withExpires($expired)
        );
        return $response;
    }
}
