<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('companies')) {
            return;
        }
        if (!Schema::hasColumn('companies', 'name_slug')) {
            Schema::table('companies', function (Blueprint $table) {
                $table->string('name_slug')->nullable()->after('id');
            });

            // Backfill slugs for existing rows
            $rows = DB::table('companies')->select('id', 'name')->get();
            foreach ($rows as $row) {
                $slug = Str::slug((string) $row->name);
                if (!$slug) {
                    $slug = 'company-'.$row->id;
                }
                DB::table('companies')->where('id', $row->id)->update(['name_slug' => $slug]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('companies') && Schema::hasColumn('companies', 'name_slug')) {
            Schema::table('companies', function (Blueprint $table) {
                $table->dropColumn('name_slug');
            });
        }
    }
};
