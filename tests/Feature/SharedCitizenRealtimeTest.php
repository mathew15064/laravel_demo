<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\God;
use App\Models\Island;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SharedCitizenRealtimeTest extends TestCase
{
    use RefreshDatabase;

    protected Island $island1;

    protected Island $island2;

    protected God $zeus;

    protected God $athena;

    protected God $apollo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->island1 = Island::create([
            'name' => 'Đảo Bình Minh',
            'slug' => 'dao-binh-minh-'.uniqid(),
            'world_x' => 0,
            'world_z' => 0,
            'radius' => 14,
            'type' => 'capital',
            'seed' => 101,
        ]);

        $this->island2 = Island::create([
            'name' => 'Đảo Cọ',
            'slug' => 'dao-co-'.uniqid(),
            'world_x' => -28,
            'world_z' => -12,
            'radius' => 10,
            'type' => 'palms',
            'seed' => 102,
        ]);

        $this->zeus = God::create([
            'name' => 'Zeus',
            'god_color' => '#8b5cf6',
            'citizens_created_count' => 0,
            'citizens_alive_count' => 0,
            'citizens_drowned_count' => 0,
            'rescued_count' => 0,
            'other_gods_rescued_count' => 0,
            'rescued_by_others_count' => 0,
        ]);

        $this->athena = God::create([
            'name' => 'Athena',
            'god_color' => '#06b6d4',
            'citizens_created_count' => 0,
            'citizens_alive_count' => 0,
            'citizens_drowned_count' => 0,
            'rescued_count' => 0,
            'other_gods_rescued_count' => 0,
            'rescued_by_others_count' => 0,
        ]);

        $this->apollo = God::create([
            'name' => 'Apollo',
            'god_color' => '#f59e0b',
            'citizens_created_count' => 0,
            'citizens_alive_count' => 0,
            'citizens_drowned_count' => 0,
            'rescued_count' => 0,
            'other_gods_rescued_count' => 0,
            'rescued_by_others_count' => 0,
        ]);
    }

    /**
     * Scenario A: Creation visibility & creator attribution.
     * Zeus creates citizen -> created_by_god_id = Zeus.
     */
    public function test_scenario_a_creation_by_god_a(): void
    {
        $response = $this->withHeader('X-God-UUID', $this->zeus->uuid)
            ->postJson("/api/islands/{$this->island1->id}/citizens", [
                'name' => 'Prometheus',
            ]);

        $response->assertStatus(201);
        $citizenId = $response->json('citizen.id');

        $citizen = Citizen::find($citizenId);
        $this->assertNotNull($citizen);
        $this->assertSame('Prometheus', $citizen->name);
        $this->assertSame($this->zeus->id, $citizen->created_by_god_id);
        $this->assertSame('alive', $citizen->status);
    }

    /**
     * Scenario B: Cross-God hold.
     * Zeus creates citizen -> Athena grabs citizen -> succeeds!
     * Athena is actor, Zeus remains creator.
     */
    public function test_scenario_b_cross_god_hold(): void
    {
        $citizen = Citizen::create([
            'name' => 'Prometheus',
            'status' => 'alive',
            'island_id' => $this->island1->id,
            'created_by_god_id' => $this->zeus->id,
            'position_x' => 0,
            'position_y' => 0,
            'position_z' => 0,
            'version' => 1,
        ]);

        // Athena grabs Prometheus
        $response = $this->withHeader('X-God-UUID', $this->athena->uuid)
            ->postJson("/api/citizens/{$citizen->id}/grab");

        $response->assertStatus(200);
        $citizen->refresh();

        $this->assertSame('held', $citizen->status);
        $this->assertSame($this->athena->id, $citizen->held_by_god_id);
        $this->assertSame($this->zeus->id, $citizen->created_by_god_id); // Creator untouched!
    }

    /**
     * Scenario C: Hold race condition.
     * When Athena is holding citizen, Apollo trying to grab citizen is rejected gracefully (409 already_held).
     */
    public function test_scenario_c_hold_race_is_rejected_gracefully(): void
    {
        $citizen = Citizen::create([
            'name' => 'Prometheus',
            'status' => 'held',
            'held_by_god_id' => $this->athena->id,
            'island_id' => $this->island1->id,
            'created_by_god_id' => $this->zeus->id,
            'position_x' => 0,
            'position_y' => 5.5,
            'position_z' => 0,
            'version' => 2,
        ]);

        // Apollo attempts to grab while Athena is holding
        $response = $this->withHeader('X-God-UUID', $this->apollo->uuid)
            ->postJson("/api/citizens/{$citizen->id}/grab");

        $response->assertStatus(409);
        $response->assertJson([
            'status' => 'already_held',
            'held_by_god_id' => $this->athena->id,
        ]);

        // Citizen remains held by Athena
        $citizen->refresh();
        $this->assertSame($this->athena->id, $citizen->held_by_god_id);
    }

    /**
     * Scenario D: Cross-God ballistic throw into ocean -> transitions to drowning.
     */
    public function test_scenario_d_cross_god_throw_into_ocean(): void
    {
        $citizen = Citizen::create([
            'name' => 'Prometheus',
            'status' => 'held',
            'held_by_god_id' => $this->athena->id,
            'island_id' => $this->island1->id,
            'created_by_god_id' => $this->zeus->id,
            'position_x' => 0,
            'position_y' => 5.5,
            'position_z' => 0,
            'version' => 2,
        ]);

        // Athena throws into open ocean coordinates
        $response = $this->withHeader('X-God-UUID', $this->athena->uuid)
            ->postJson("/api/citizens/{$citizen->id}/throw", [
                'start_position' => ['x' => 0, 'y' => 5.5, 'z' => 0],
                'velocity' => ['x' => 100, 'y' => 5.0, 'z' => 100], // Far into open ocean
            ]);

        $response->assertStatus(200);
        $response->assertJson(['outcome' => 'landed_ocean']);

        $citizen->refresh();
        $this->assertSame('drowning', $citizen->status);
        $this->assertNull($citizen->held_by_god_id);
        $this->assertSame($this->athena->id, $citizen->thrown_by_god_id);
        $this->assertSame($this->zeus->id, $citizen->created_by_god_id);
        $this->assertNotNull($citizen->drowning_deadline_at);
    }

    /**
     * Scenario E: Cross-God rescue.
     * Citizen created by Zeus, drowning. Apollo rescues citizen!
     * Apollo gains rescued_count, other_gods_rescued_count.
     * Zeus gains rescued_by_others_count.
     */
    public function test_scenario_e_cross_god_rescue(): void
    {
        $nowMs = (int) round(microtime(true) * 1000);
        $citizen = Citizen::create([
            'name' => 'Prometheus',
            'status' => 'drowning',
            'last_island_id' => $this->island1->id,
            'created_by_god_id' => $this->zeus->id,
            'position_x' => 60,
            'position_y' => -0.2,
            'position_z' => 60,
            'drowning_started_at' => $nowMs,
            'drowning_deadline_at' => $nowMs + 10000,
            'drowning_version' => 1,
            'version' => 3,
        ]);

        // Apollo rescues Zeus's citizen
        $response = $this->withHeader('X-God-UUID', $this->apollo->uuid)
            ->postJson("/api/citizens/{$citizen->id}/rescue");

        $response->assertStatus(200);
        $response->assertJson(['status' => 'ok']);

        $citizen->refresh();
        $this->assertSame('alive', $citizen->status);
        $this->assertSame($this->apollo->id, $citizen->last_rescued_by_god_id);
        $this->assertSame($this->zeus->id, $citizen->created_by_god_id);
        $this->assertNull($citizen->drowning_deadline_at);

        // Verify god stats
        $this->apollo->refresh();
        $this->zeus->refresh();
        $this->assertSame(1, $this->apollo->rescued_count);
        $this->assertSame(1, $this->apollo->other_gods_rescued_count);
        $this->assertSame(1, $this->zeus->rescued_by_others_count);
    }

    /**
     * Scenario F: Rescue race condition.
     * When citizen is rescued by Apollo, a near-simultaneous rescue from Athena returns already_rescued.
     */
    public function test_scenario_f_rescue_race_handling(): void
    {
        $nowMs = (int) round(microtime(true) * 1000);
        $citizen = Citizen::create([
            'name' => 'Prometheus',
            'status' => 'drowning',
            'last_island_id' => $this->island1->id,
            'created_by_god_id' => $this->zeus->id,
            'position_x' => 60,
            'position_y' => -0.2,
            'position_z' => 60,
            'drowning_started_at' => $nowMs,
            'drowning_deadline_at' => $nowMs + 10000,
            'drowning_version' => 1,
            'version' => 3,
        ]);

        // Apollo rescues first
        $res1 = $this->withHeader('X-God-UUID', $this->apollo->uuid)
            ->postJson("/api/citizens/{$citizen->id}/rescue");
        $res1->assertStatus(200);
        $res1->assertJson(['status' => 'ok']);

        // Athena rescues second (simultaneous arrival after commit)
        $res2 = $this->withHeader('X-God-UUID', $this->athena->uuid)
            ->postJson("/api/citizens/{$citizen->id}/rescue");
        $res2->assertStatus(200);
        $res2->assertJson(['status' => 'already_rescued']);

        // Only 1 rescue counted for Apollo, 0 for Athena
        $this->apollo->refresh();
        $this->athena->refresh();
        $this->assertSame(1, $this->apollo->rescued_count);
        $this->assertSame(0, $this->athena->rescued_count);
    }

    /**
     * Scenario G: Three-God cooperative lifecycle chain.
     * Zeus creates -> Athena grabs & throws -> Apollo rescues -> final status alive everywhere.
     */
    public function test_scenario_g_three_god_full_chain(): void
    {
        // 1. Zeus creates
        $createRes = $this->withHeader('X-God-UUID', $this->zeus->uuid)
            ->postJson("/api/islands/{$this->island1->id}/citizens", [
                'name' => 'Hermes-Citizen',
            ]);
        $createRes->assertStatus(201);
        $citId = $createRes->json('citizen.id');

        // 2. Athena grabs
        $grabRes = $this->withHeader('X-God-UUID', $this->athena->uuid)
            ->postJson("/api/citizens/{$citId}/grab");
        $grabRes->assertStatus(200);

        // 3. Athena throws into ocean
        $throwRes = $this->withHeader('X-God-UUID', $this->athena->uuid)
            ->postJson("/api/citizens/{$citId}/throw", [
                'start_position' => ['x' => 0, 'y' => 5.5, 'z' => 0],
                'velocity' => ['x' => 80, 'y' => 4.0, 'z' => 80],
            ]);
        $throwRes->assertStatus(200);
        $throwRes->assertJson(['outcome' => 'landed_ocean']);

        // 4. Apollo rescues
        $rescueRes = $this->withHeader('X-God-UUID', $this->apollo->uuid)
            ->postJson("/api/citizens/{$citId}/rescue");
        $rescueRes->assertStatus(200);
        $rescueRes->assertJson(['status' => 'ok']);

        $cit = Citizen::find($citId);
        $this->assertSame('alive', $cit->status);
        $this->assertSame($this->zeus->id, $cit->created_by_god_id);
        $this->assertSame($this->apollo->id, $cit->last_rescued_by_god_id);
    }

    /**
     * Scenario H: Initial state sync and world snapshot convergence.
     * Remote joining God fetches /api/world and sees complete citizen attributes.
     */
    public function test_scenario_h_world_api_snapshot_convergence(): void
    {
        $aliveName = 'Citizen-Alive-'.uniqid();
        $heldName = 'Citizen-Held-'.uniqid();

        Citizen::create([
            'name' => $aliveName,
            'status' => 'alive',
            'island_id' => $this->island1->id,
            'created_by_god_id' => $this->zeus->id,
            'position_x' => 0,
            'position_y' => 0,
            'position_z' => 0,
        ]);

        Citizen::create([
            'name' => $heldName,
            'status' => 'held',
            'held_by_god_id' => $this->athena->id,
            'island_id' => $this->island1->id,
            'created_by_god_id' => $this->zeus->id,
            'position_x' => 0,
            'position_y' => 5.5,
            'position_z' => 0,
        ]);

        $res = $this->withHeader('X-God-UUID', $this->apollo->uuid)
            ->getJson('/api/world');

        $res->assertStatus(200);
        $citizens = collect($res->json('citizens'));

        $this->assertGreaterThanOrEqual(2, $citizens->count());
        $held = $citizens->firstWhere('name', $heldName);
        $this->assertNotNull($held);
        $this->assertSame('held', $held['status']);
        $this->assertSame($this->athena->id, $held['held_by_god_id']);
        $this->assertSame($this->zeus->id, $held['created_by_god_id']);

        $alive = $citizens->firstWhere('name', $aliveName);
        $this->assertNotNull($alive);
        $this->assertSame('alive', $alive['status']);
        $this->assertSame($this->zeus->id, $alive['created_by_god_id']);
    }
}
