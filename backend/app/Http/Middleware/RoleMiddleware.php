<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->attributes->get('auth_user');
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        $role = (string) ($user->role ?? 'user');
        if (!in_array($role, $roles, true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return $next($request);
    }
}
