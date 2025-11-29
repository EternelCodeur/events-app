<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Allow both values during transition
        DB::statement("ALTER TABLE events MODIFY COLUMN status ENUM('en_attente','occupe','confirme','annuler') NOT NULL DEFAULT 'en_attente'");
        // Migrate existing rows
        DB::table('events')->where('status', 'occupe')->update(['status' => 'confirme']);
        // Remove old value
        DB::statement("ALTER TABLE events MODIFY COLUMN status ENUM('en_attente','confirme','annuler') NOT NULL DEFAULT 'en_attente'");
    }

    public function down(): void
    {
        // Allow both values during transition
        DB::statement("ALTER TABLE events MODIFY COLUMN status ENUM('en_attente','occupe','confirme','annuler') NOT NULL DEFAULT 'en_attente'");
        // Revert rows
        DB::table('events')->where('status', 'confirme')->update(['status' => 'occupe']);
        // Remove 'confirme' to go back
        DB::statement("ALTER TABLE events MODIFY COLUMN status ENUM('en_attente','occupe','annuler') NOT NULL DEFAULT 'en_attente'");
    }
};
