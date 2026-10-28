<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\God;
use App\Models\Island;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CitizenCounterConsistencyTest extends TestCase
{
    use RefreshDatabase;

    private God $god;

    private Island $island;

    protected function setUp(): void
    {
        parent::setUp();

        $this->god = God::create([
            'name' => 'Zeus Test',
            'god_color' => '#8b5cf6',
            'citizens_created_count' => 0,
            'citizens_alive_count' => 0,
            'citizens_drowned_count' => 0,
        ]);

        $this->island = Island::create([
            'name' => 'Đảo Test',
            'slug' => 'dao-test',
            'world_x' => 0,
            'world_z' => 0,
            'radius' => 20,
            'type' => 'tropical',
            'seed' => 12345,
        ]);
    }

    /**
     * Test A — Normal death: alive_count decrements from 1 to 0, drowned_count increments by 1.
     */
    public function test_normal_drowning_death_decrements_alive_count_and_increments_drowned_count(): void
    {
        // 1. Create citizen
        $citizen = Citizen::create([
            'name' => 'Dân Test A',
            'island_id' => $this->island->id,
            'created_by_god_id' => $this->god->id,
            'status' => 'alive',
            'position_x' => 0,
            'position_y' => 0,
            'position_z' => 0,
        ]);

        $this->god->update([
            'citizens_created_count' => 1,
            'citizens_alive_count' => 1,
            'citizens_drowned_count' => 0,
        ]);

        // 2. Transition to drowning (deadline in the past)
        $pastMs = (int) round(microtime(true) * 1000) - 2000;
        $citizen->update([
            'status' => 'drowning',
            'drowning_started_at' => $pastMs - 3000,
            'drowning_deadline_at' => $pastMs,
        ]);

        // Alive count must NOT change when entering drowning state
        $this->assertEquals(1, $this->god->fresh()->citizens_alive_count);

        // 3. Finalize drowning via POST /api/citizens/{id}/drown
        $response = $this->postJson("/api/citizens/{$citizen->id}/drown");

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'ok',
            'citizen' => [
                'id' => $citizen->id,
                'status' => 'dead',
                'death_reason' => 'drowned',
            ],
        ]);

        $this->assertEquals(0, $this->god->fresh()->citizens_alive_count);
        $this->assertEquals(1, $this->god->fresh()->citizens_drowned_count);
    }

    /**
     * Test B — Duplicate drown is idempotent and does not double decrement.
     */
    public function test_duplicate_drown_calls_are_idempotent_and_do_not_double_decrement(): void
    {
        $citizen = Citizen::create([
            'name' => 'Dân Test B',
            'island_id' => $this->island->id,
            'created_by_god_id' => $this->god->id,
            'status' => 'drowning',
            'drowning_started_at' => 1000,
            'drowning_deadline_at' => 2000,
            'position_x' => 0,
            'position_y' => 0,
            'position_z' => 0,
        ]);

        $this->god->update([
            'citizens_created_count' => 1,
            'citizens_alive_count' => 1,
            'citizens_drowned_count' => 0,
        ]);

        // First drown call
        $res1 = $this->postJson("/api/citizens/{$citizen->id}/drown");
        $res1->assertStatus(200);
        $res1->assertJson(['status' => 'ok']);

        $this->assertEquals(0, $this->god->fresh()->citizens_alive_count);
        $this->assertEquals(1, $this->god->fresh()->citizens_drowned_count);

        // Second drown call (duplicate/zombie call)
        $res2 = $this->postJson("/api/citizens/{$citizen->id}/drown");
        $res2->assertStatus(200);
        $res2->assertJson(['status' => 'already_dead']);

        // Invariant: Counters MUST remain exactly 0 alive and 1 drowned
        $this->assertEquals(0, $this->god->fresh()->citizens_alive_count);
        $this->assertEquals(1, $this->god->fresh()->citizens_drowned_count);
    }

    /**
     * Test C — Concurrent-ish duplicate path: timeout during rescue + explicit drown endpoint.
     */
    public function test_timeout_rescue_and_explicit_drown_endpoint_do_not_double_count(): void
    {
        $pastMs = (int) round(microtime(true) * 1000) - 1000;
        $citizen = Citizen::create([
            'name' => 'Dân Test C',
            'island_id' => $this->island->id,
            'created_by_god_id' => $this->god->id,
            'status' => 'drowning',
            'drowning_started_at' => $pastMs - 3000,
            'drowning_deadline_at' => $pastMs,
            'position_x' => 0,
            'position_y' => 0,
            'position_z' => 0,
        ]);

        $this->god->update([
            'citizens_created_count' => 1,
            'citizens_alive_count' => 1,
            'citizens_drowned_count' => 0,
        ]);

        // 1. First path: Rescue endpoint receives call after deadline has already expired
        $rescueRes = $this->postJson("/api/citizens/{$citizen->id}/rescue", [
            'god_uuid' => $this->god->uuid,
        ]);
        $rescueRes->assertStatus(410);
        $rescueRes->assertJson(['status' => 'already_dead']);

        $this->assertEquals(0, $this->god->fresh()->citizens_alive_count);
        $this->assertEquals(1, $this->god->fresh()->citizens_drowned_count);

        // 2. Second path: Explicit drown endpoint arrives simultaneously/shortly after
        $drownRes = $this->postJson("/api/citizens/{$citizen->id}/drown");
        $drownRes->assertStatus(200);
        $drownRes->assertJson(['status' => 'already_dead']);

        // Invariant: counters mutated exactly once
        $this->assertEquals(0, $this->god->fresh()->citizens_alive_count);
        $this->assertEquals(1, $this->god->fresh()->citizens_drowned_count);
    }

    /**
     * Test D — Rescue before deadline preserves citizen without mutating alive/drowned counters.
     */
    public function test_successful_rescue_preserves_alive_and_drowned_counters(): void
    {
        $futureMs = (int) round(microtime(true) * 1000) + 10000;
        $citizen = Citizen::create([
            'name' => 'Dân Test D',
            'island_id' => $this->island->id,
            'created_by_god_id' => $this->god->id,
            'status' => 'drowning',
            'drowning_started_at' => $futureMs - 12000,
            'drowning_deadline_at' => $futureMs,
            'position_x' => 0,
            'position_y' => 0,
            'position_z' => 0,
        ]);

        $this->god->update([
            'citizens_created_count' => 1,
            'citizens_alive_count' => 1,
            'citizens_drowned_count' => 0,
        ]);

        $rescueRes = $this->postJson("/api/citizens/{$citizen->id}/rescue", [
            'god_uuid' => $this->god->uuid,
        ]);
        $rescueRes->assertStatus(200);
        $rescueRes->assertJson(['status' => 'ok']);

        $this->assertEquals('alive', $citizen->fresh()->status);
        $this->assertEquals(1, $this->god->fresh()->citizens_alive_count);
        $this->assertEquals(0, $this->god->fresh()->citizens_drowned_count);
    }

    /**
     * Test E — Held citizen: alive -> held -> alive keeps alive_count unchanged.
     */
    public function test_grab_and_release_keeps_alive_count_unchanged(): void
    {
        $citizen = Citizen::create([
            'name' => 'Dân Test E',
            'island_id' => $this->island->id,
            'created_by_god_id' => $this->god->id,
            'status' => 'alive',
            'position_x' => 0,
            'position_y' => 0,
            'position_z' => 0,
        ]);

        $this->god->update(['citizens_alive_count' => 1]);

        // Grab
        $grabRes = $this->postJson("/api/citizens/{$citizen->id}/grab", [
            'god_uuid' => $this->god->uuid,
        ]);
        $grabRes->assertStatus(200);
        $this->assertEquals('held', $citizen->fresh()->status);
        $this->assertEquals(1, $this->god->fresh()->citizens_alive_count);

        // Release
        $releaseRes = $this->postJson("/api/citizens/{$citizen->id}/release", [
            'god_uuid' => $this->god->uuid,
            'position' => ['x' => 10, 'y' => 2.0, 'z' => 10],
            'island_id' => $this->island->id,
        ]);
        $releaseRes->assertStatus(200);
        $this->assertEquals('alive', $citizen->fresh()->status);
        $this->assertEquals(1, $this->god->fresh()->citizens_alive_count);
    }

    /**
     * Test F — Drowning transition: alive -> drowning keeps alive_count unchanged.
     */
    public function test_drowning_transition_keeps_alive_count_unchanged(): void
    {
        $citizen = Citizen::create([
            'name' => 'Dân Test F',
            'island_id' => $this->island->id,
            'created_by_god_id' => $this->god->id,
            'status' => 'alive',
            'position_x' => 0,
            'position_y' => 0,
            'position_z' => 0,
        ]);

        $this->god->update(['citizens_alive_count' => 1]);

        $drownStartRes = $this->postJson("/api/citizens/{$citizen->id}/drowning", [
            'timeout_ms' => 3000,
        ]);
        $drownStartRes->assertStatus(200);
        $this->assertEquals('drowning', $citizen->fresh()->status);
        $this->assertEquals(1, $this->god->fresh()->citizens_alive_count);
    }

    /**
     * Test G — Existing drift reconciliation: corrects drifted counters.
     */
    public function test_drift_reconciliation_command_corrects_inconsistent_counters(): void
    {
        // Create 3 citizens: 1 alive, 1 held, 1 drowning, 1 dead
        Citizen::create([
            'name' => 'C1',
            'island_id' => $this->island->id,
            'created_by_god_id' => $this->god->id,
            'status' => 'alive',
        ]);
        Citizen::create([
            'name' => 'C2',
            'island_id' => $this->island->id,
            'created_by_god_id' => $this->god->id,
            'status' => 'held',
        ]);
        Citizen::create([
            'name' => 'C3',
            'island_id' => $this->island->id,
            'created_by_god_id' => $this->god->id,
            'status' => 'drowning',
        ]);
        Citizen::create([
            'name' => 'C4',
            'island_id' => $this->island->id,
            'created_by_god_id' => $this->god->id,
            'status' => 'dead',
            'death_reason' => 'drowned',
        ]);

        // Deliberately corrupt God counters
        $this->god->update([
            'citizens_created_count' => 99,
            'citizens_alive_count' => 0, // Inconsistent!
            'citizens_drowned_count' => 50,
        ]);

        // Run reconciliation command
        $this->artisan('paradise:reconcile-counters', ['--god' => $this->god->id])
            ->assertSuccessful();

        $freshGod = $this->god->fresh();
        $this->assertEquals(4, $freshGod->citizens_created_count);
        $this->assertEquals(3, $freshGod->citizens_alive_count); // alive + held + drowning
        $this->assertEquals(1, $freshGod->citizens_drowned_count); // 1 dead drowned
    }

    /**
     * Test H — Production Incident Reproduction:
     * When alive_count is 0 while a citizen is drowning, finalizeDrowning does NOT trigger SQLSTATE[22003].
     */
    public function test_production_incident_condition_does_not_throw_out_of_range(): void
    {
        $pastMs = (int) round(microtime(true) * 1000) - 2000;
        $citizen = Citizen::create([
            'name' => 'Dân Gặp Lỗi Prod',
            'island_id' => $this->island->id,
            'created_by_god_id' => $this->god->id,
            'status' => 'drowning',
            'drowning_started_at' => $pastMs - 3000,
            'drowning_deadline_at' => $pastMs,
            'position_x' => 0,
            'position_y' => 0,
            'position_z' => 0,
        ]);

        // Set exact production failure condition: alive_count = 0
        $this->god->update([
            'citizens_alive_count' => 0,
            'citizens_drowned_count' => 0,
        ]);

        // Call drown endpoint: must NOT trigger SQLSTATE[22003] or HTTP 500
        $response = $this->postJson("/api/citizens/{$citizen->id}/drown");

        $response->assertStatus(200);
        $this->assertEquals('dead', $citizen->fresh()->status);
        $this->assertEquals(0, $this->god->fresh()->citizens_alive_count);
        $this->assertEquals(1, $this->god->fresh()->citizens_drowned_count);
    }
}
