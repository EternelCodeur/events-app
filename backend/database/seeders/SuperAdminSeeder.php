<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = 'superadmin@example.com';
        $user = User::where('email', $email)->first();
        if (!$user) {
            User::create([
                'name' => 'Super Admin',
                'email' => $email,
                'password' => 'password123',
                'role' => 'superadmin',
            ]);
        } else {
            $user->role = 'superadmin';
            $user->save();
        }
    }
}
