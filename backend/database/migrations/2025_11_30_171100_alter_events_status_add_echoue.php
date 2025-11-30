<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `events` MODIFY `status` ENUM('en_attente','confirme','annuler','en_cours','termine','echoue') NOT NULL DEFAULT 'en_attente'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `events` MODIFY `status` ENUM('en_attente','confirme','annuler','en_cours','termine') NOT NULL DEFAULT 'en_attente'");
    }
};
