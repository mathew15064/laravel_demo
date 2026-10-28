<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('citizens', function (Blueprint $table) {
            $table->foreignId('held_by_god_id')->nullable()->after('last_rescued_by_god_id')->constrained('gods')->nullOnDelete();
            $table->unsignedBigInteger('version')->default(1)->after('drowning_version');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('citizens', function (Blueprint $table) {
            $table->dropForeign(['held_by_god_id']);
            $table->dropColumn(['held_by_god_id', 'version']);
        });
    }
};
