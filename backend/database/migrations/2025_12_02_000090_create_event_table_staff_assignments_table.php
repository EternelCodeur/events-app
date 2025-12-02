<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_table_staff_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entreprise_id')->constrained('entreprises')->cascadeOnDelete();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignId('event_table_id')->constrained('event_tables')->cascadeOnDelete();
            $table->foreignId('staff_id')->constrained('staff')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['event_id', 'event_table_id', 'staff_id'], 'uniq_event_table_staff');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_table_staff_assignments');
    }
};
