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
        Schema::create('citizens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('island_id')->nullable()->constrained('islands')->nullOnDelete();
            $table->foreignId('created_by_god_id')->constrained('gods')->cascadeOnDelete();
            $table->string('name', 60);
            $table->string('status', 20)->default('alive'); // alive, drowning, dead
            $table->string('skin_tone', 20);
            $table->string('clothing_color', 20)->default('#3b82f6');
            $table->float('position_x')->default(0);
            $table->float('position_y')->default(0);
            $table->float('position_z')->default(0);
            $table->foreignId('last_island_id')->nullable()->constrained('islands')->nullOnDelete();
            $table->string('death_reason', 40)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('citizens');
    }
};
