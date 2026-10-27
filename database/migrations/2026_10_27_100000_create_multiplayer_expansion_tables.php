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
        // 1. Extend gods table
        Schema::table('gods', function (Blueprint $table) {
            $table->string('god_color', 30)->default('#8b5cf6')->after('name');
            $table->unsignedInteger('citizens_created_count')->default(0)->after('rescued_count');
            $table->unsignedInteger('citizens_alive_count')->default(0)->after('citizens_created_count');
            $table->unsignedInteger('citizens_drowned_count')->default(0)->after('citizens_alive_count');
            $table->unsignedInteger('other_gods_rescued_count')->default(0)->after('citizens_drowned_count');
            $table->unsignedInteger('rescued_by_others_count')->default(0)->after('other_gods_rescued_count');
            $table->timestamp('last_seen_at')->nullable()->after('rescued_by_others_count');
        });

        // 2. Extend islands table with governance
        Schema::table('islands', function (Blueprint $table) {
            $table->foreignId('governed_by_god_id')->nullable()->after('seed')->constrained('gods')->nullOnDelete();
            $table->string('banner_name', 80)->nullable()->after('governed_by_god_id');
        });

        // 3. Extend citizens table with authoritative drowning & throwing ownership
        Schema::table('citizens', function (Blueprint $table) {
            $table->foreignId('thrown_by_god_id')->nullable()->after('created_by_god_id')->constrained('gods')->nullOnDelete();
            $table->foreignId('last_rescued_by_god_id')->nullable()->after('thrown_by_god_id')->constrained('gods')->nullOnDelete();
            $table->bigInteger('drowning_started_at')->nullable()->after('death_reason');
            $table->bigInteger('drowning_deadline_at')->nullable()->after('drowning_started_at');
            $table->unsignedInteger('drowning_version')->default(0)->after('drowning_deadline_at');
        });

        // 4. Create rescues audit table
        Schema::create('rescues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('citizen_id')->constrained('citizens')->cascadeOnDelete();
            $table->foreignId('rescued_by_god_id')->constrained('gods')->cascadeOnDelete();
            $table->foreignId('citizen_owner_god_id')->nullable()->constrained('gods')->nullOnDelete();
            $table->foreignId('island_id')->nullable()->constrained('islands')->nullOnDelete();
            $table->timestamp('rescued_at')->useCurrent();
            $table->timestamps();
        });

        // 5. Create world_states table
        Schema::create('world_states', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('world_version')->default(1000);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('world_states');
        Schema::dropIfExists('rescues');

        Schema::table('citizens', function (Blueprint $table) {
            $table->dropForeign(['thrown_by_god_id']);
            $table->dropForeign(['last_rescued_by_god_id']);
            $table->dropColumn([
                'thrown_by_god_id',
                'last_rescued_by_god_id',
                'drowning_started_at',
                'drowning_deadline_at',
                'drowning_version',
            ]);
        });

        Schema::table('islands', function (Blueprint $table) {
            $table->dropForeign(['governed_by_god_id']);
            $table->dropColumn(['governed_by_god_id', 'banner_name']);
        });

        Schema::table('gods', function (Blueprint $table) {
            $table->dropColumn([
                'god_color',
                'citizens_created_count',
                'citizens_alive_count',
                'citizens_drowned_count',
                'other_gods_rescued_count',
                'rescued_by_others_count',
                'last_seen_at',
            ]);
        });
    }
};
