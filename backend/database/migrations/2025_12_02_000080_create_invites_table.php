<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entreprise_id')->constrained('entreprises')->cascadeOnDelete();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignId('event_table_id')->nullable()->constrained('event_tables')->nullOnDelete();
            $table->string('nom');
            $table->string('prenom');
            $table->string('telephone', 191);
            $table->unsignedInteger('personnes')->default(1);
            $table->enum('statut', ['confirmed', 'pending'])->default('pending');
            $table->boolean('present')->default(false);
            $table->time('heure_arrivee')->nullable();
            $table->text('notes')->nullable();
            $table->json('additional_guests')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invites');
    }
};
