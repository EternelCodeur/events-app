<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('companies')) {
            return;
        }
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name_slug', 191)->unique();
            $table->string('name', 191)->unique();
            $table->string('admin_name')->nullable();
            $table->string('email', 191)->nullable()->unique();
            $table->string('phone')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
