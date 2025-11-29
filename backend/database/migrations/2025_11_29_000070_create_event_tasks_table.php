<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entreprise_id')->constrained('entreprises')->cascadeOnDelete();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->string('name', 191);
            $table->string('slug', 191);
            $table->timestamps();
            $table->unique(['event_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_tasks');
    }
};
