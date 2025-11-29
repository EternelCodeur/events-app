<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entreprise_id')->constrained('entreprises')->cascadeOnDelete();
            $table->foreignId('venue_id')->nullable()->constrained('venues')->nullOnDelete();
            $table->string('title');
            $table->date('date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->unsignedInteger('guests')->default(0);
            $table->string('budget', 191)->nullable();
            $table->enum('status', ['en_attente', 'confirme', 'annuler'])->default('en_attente');
            $table->enum('event_type', ['mariage', 'celebration_religieuse', 'cocktail'])->nullable();
            $table->enum('area_choice', ['interieur', 'exterieur', 'les_deux'])->nullable();
            $table->enum('mariage_interior_subtype', ['civil', 'coutumier'])->nullable();
            $table->enum('mariage_exterior_subtype', ['civil', 'coutumier'])->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
