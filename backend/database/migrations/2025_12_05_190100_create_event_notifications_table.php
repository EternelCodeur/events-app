<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entreprise_id')->constrained('entreprises')->cascadeOnDelete();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->string('channel', 32); // e.g. whatsapp
            $table->string('category', 64); // e.g. jminus1
            $table->string('recipient', 191); // phone or email
            $table->text('message');
            $table->enum('status', ['sent', 'failed', 'skipped'])->default('sent');
            $table->json('meta')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->unique(['event_id', 'channel', 'category', 'recipient'], 'uniq_event_notif_once');
            $table->index(['channel', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_notifications');
    }
};
