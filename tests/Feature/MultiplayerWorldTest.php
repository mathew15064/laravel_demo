<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\God;
use App\Models\Island;
use App\Models\Rescue;
use Tests\TestCase;

class MultiplayerWorldTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate:fresh --seed');
    }

    public function test_world_api_returns_multiplayer_state(): void
    {
        $response = $this->getJson('/api/world');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'world_version',
            'world_population',
            'online_gods',
            'top_rescuers',
            'islands' => [
                '*' => [
                    'id',
                    'name',
                    'world_x',
                    'world_z',
                    'radius',
                    'population',
                ],
            ],
            'citizens' => [
                '*' => [
                    'id',
                    'name',
                    'status',
                    'skin_tone',
                    'clothing_color',
                    'created_by_god_id',
                    'creator_name',
                    'creator_color',
                    'position',
                ],
            ],
        ]);

        $this->assertGreaterThanOrEqual(1000, $response->json('world_version'));
    }

    public function test_god_registration_with_color(): void
    {
        $response = $this->postJson('/api/gods', [
            'name' => 'Poseidon',
            'god_color' => '#06b6d4',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('god.name', 'Poseidon');
        $response->assertJsonPath('god.god_color', '#06b6d4');
        $this->assertDatabaseHas('gods', ['name' => 'Poseidon', 'god_color' => '#06b6d4']);
    }

    public function test_shared_control_any_god_can_throw_citizen(): void
    {
        $zeus = God::where('name', 'Zeus')->first();
        $athena = God::where('name', 'Athena')->first();

        // Citizen created by Zeus
        $citizen = Citizen::where('created_by_god_id', $zeus->id)->first();

        // Athena throws Zeus's citizen in cooperative shared world -> 200 OK!
        $response = $this->withHeader('X-God-UUID', $athena->uuid)
            ->postJson("/api/citizens/{$citizen->id}/throw", [
                'start_position' => ['x' => 0, 'y' => 5, 'z' => 0],
                'velocity' => ['x' => 1, 'y' => 5, 'z' => 1],
            ]);

        $response->assertStatus(200);
        $this->assertContains($response->json('outcome'), ['landed_island', 'landed_ocean']);

        $citizen->refresh();
        $this->assertEquals($athena->id, $citizen->thrown_by_god_id);
    }

    public function test_grab_concurrent_grab_and_release(): void
    {
        $zeus = God::where('name', 'Zeus')->first();
        $athena = God::where('name', 'Athena')->first();
        $citizen = Citizen::first();

        // 1. Zeus grabs citizen
        $grabRes = $this->withHeader('X-God-UUID', $zeus->uuid)
            ->postJson("/api/citizens/{$citizen->id}/grab");

        $grabRes->assertStatus(200);
        $grabRes->assertJsonPath('status', 'ok');

        $citizen->refresh();
        $this->assertEquals('held', $citizen->status);
        $this->assertEquals($zeus->id, $citizen->held_by_god_id);

        // 2. Athena attempts concurrent grab while Zeus holds -> 409 Conflict
        $conflictRes = $this->withHeader('X-God-UUID', $athena->uuid)
            ->postJson("/api/citizens/{$citizen->id}/grab");

        $conflictRes->assertStatus(409);
        $conflictRes->assertJsonPath('status', 'already_held');

        // 3. Zeus releases citizen
        $releaseRes = $this->withHeader('X-God-UUID', $zeus->uuid)
            ->postJson("/api/citizens/{$citizen->id}/release");

        $releaseRes->assertStatus(200);
        $citizen->refresh();
        $this->assertEquals('alive', $citizen->status);
        $this->assertNull($citizen->held_by_god_id);

        // 4. Athena can now grab successfully
        $athenaGrab = $this->withHeader('X-God-UUID', $athena->uuid)
            ->postJson("/api/citizens/{$citizen->id}/grab");

        $athenaGrab->assertStatus(200);
        $citizen->refresh();
        $this->assertEquals($athena->id, $citizen->held_by_god_id);
    }

    public function test_authoritative_throw_into_ocean_starts_drowning(): void
    {
        $zeus = God::where('name', 'Zeus')->first();
        $citizen = Citizen::where('created_by_god_id', $zeus->id)->first();

        // Throw far into the ocean away from any island
        $response = $this->withHeader('X-God-UUID', $zeus->uuid)
            ->postJson("/api/citizens/{$citizen->id}/throw", [
                'start_position' => ['x' => 0, 'y' => 5, 'z' => 0],
                'velocity' => ['x' => 100, 'y' => 5, 'z' => 100],
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('outcome', 'landed_ocean');

        $citizen->refresh();
        $this->assertEquals('drowning', $citizen->status);
        $this->assertNotNull($citizen->drowning_started_at);
        $this->assertNotNull($citizen->drowning_deadline_at);
        $this->assertGreaterThan($citizen->drowning_started_at, $citizen->drowning_deadline_at);
    }

    public function test_cooperative_rescue_and_race_condition(): void
    {
        $zeus = God::where('name', 'Zeus')->first();
        $athena = God::where('name', 'Athena')->first();

        // Setup citizen in drowning state
        $citizen = Citizen::where('created_by_god_id', $zeus->id)->first();
        $nowMs = (int) round(microtime(true) * 1000);
        $citizen->update([
            'status' => 'drowning',
            'drowning_started_at' => $nowMs,
            'drowning_deadline_at' => $nowMs + 10000,
        ]);

        $initialAthenaRescued = $athena->rescued_count;
        $initialAthenaOtherRescued = $athena->other_gods_rescued_count;
        $initialZeusRescuedByOthers = $zeus->rescued_by_others_count;

        // 1. Athena rescues Zeus's citizen
        $rescueResponse = $this->withHeader('X-God-UUID', $athena->uuid)
            ->postJson("/api/citizens/{$citizen->id}/rescue");

        $rescueResponse->assertStatus(200);
        $rescueResponse->assertJsonPath('status', 'ok');

        $citizen->refresh();
        $this->assertEquals('alive', $citizen->status);
        $this->assertNull($citizen->drowning_deadline_at);

        // Check Athena's stats incremented
        $athena->refresh();
        $zeus->refresh();
        $this->assertEquals($initialAthenaRescued + 1, $athena->rescued_count);
        $this->assertEquals($initialAthenaOtherRescued + 1, $athena->other_gods_rescued_count);
        $this->assertEquals($initialZeusRescuedByOthers + 1, $zeus->rescued_by_others_count);

        // Check rescue record created
        $this->assertDatabaseHas('rescues', [
            'citizen_id' => $citizen->id,
            'rescued_by_god_id' => $athena->id,
            'citizen_owner_god_id' => $zeus->id,
        ]);

        // 2. Race condition: Apollo simultaneously clicks rescue on already rescued citizen
        $apollo = God::where('name', 'Apollo')->first();
        $secondRescue = $this->withHeader('X-God-UUID', $apollo->uuid)
            ->postJson("/api/citizens/{$citizen->id}/rescue");

        // Returns graceful 200 with already_rescued status, no crash or duplicate stats!
        $secondRescue->assertStatus(200);
        $secondRescue->assertJsonPath('status', 'already_rescued');
    }

    public function test_island_rename_has_no_ownership_barriers(): void
    {
        $zeus = God::where('name', 'Zeus')->first();
        $athena = God::where('name', 'Athena')->first();
        $island = Island::first();

        // Zeus renames island -> 200 OK
        $zeusRename = $this->withHeader('X-God-UUID', $zeus->uuid)
            ->patchJson("/api/islands/{$island->id}", ['name' => 'Đảo Ánh Dương']);

        $zeusRename->assertStatus(200);
        $this->assertEquals('Đảo Ánh Dương', $island->fresh()->name);

        // Athena also renames the same island -> 200 OK (no ownership barrier!)
        $athenaRename = $this->withHeader('X-God-UUID', $athena->uuid)
            ->patchJson("/api/islands/{$island->id}", ['name' => 'Đảo Trí Tuệ']);

        $athenaRename->assertStatus(200);
        $this->assertEquals('Đảo Trí Tuệ', $island->fresh()->name);
    }
}
