<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\God;
use App\Models\Island;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ParadiseGodsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed deterministic test islands
        Island::create([
            'name' => 'Đảo Bình Minh',
            'slug' => 'dao-binh-minh',
            'world_x' => 0.0,
            'world_z' => 0.0,
            'radius' => 14.0,
            'type' => 'capital',
            'seed' => 1,
        ]);

        Island::create([
            'name' => 'Đảo Cọ',
            'slug' => 'dao-co',
            'world_x' => -28.0,
            'world_z' => -12.0,
            'radius' => 10.5,
            'type' => 'palms',
            'seed' => 2,
        ]);
    }

    public function test_game_shell_view_renders_successfully(): void
    {
        $response = $this->get('/world');
        $response->assertStatus(200);
        $response->assertSee('game-canvas-container');
        $response->assertSee('god-welcome-overlay');
    }

    public function test_god_creation_persists_and_returns_safe_uuid(): void
    {
        $response = $this->postJson('/api/gods', [
            'name' => 'Thần Huynh',
        ]);

        $response->assertStatus(201);
        $response->assertJson([
            'status' => 'ok',
            'god' => [
                'name' => 'Thần Huynh',
            ],
        ]);

        $this->assertDatabaseHas('gods', [
            'name' => 'Thần Huynh',
        ]);

        $uuid = $response->json('god.uuid');
        $this->assertNotEmpty($uuid);
    }

    public function test_god_restoration_by_uuid(): void
    {
        $god = God::create([
            'name' => 'Poseidon',
            'rescued_count' => 3,
        ]);

        $response = $this->getJson("/api/gods/{$god->uuid}");
        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'ok',
            'god' => [
                'id' => $god->id,
                'uuid' => $god->uuid,
                'name' => 'Poseidon',
                'stats' => [
                    'rescued' => 3,
                ],
            ],
        ]);
    }

    public function test_god_rename(): void
    {
        $god = God::create(['name' => 'Zeus']);

        $response = $this->patchJson("/api/gods/{$god->uuid}", [
            'name' => 'Lord Zeus',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('gods', [
            'id' => $god->id,
            'name' => 'Lord Zeus',
        ]);
    }

    public function test_god_statistics_calculation(): void
    {
        $god = God::create(['name' => 'Thần Debug', 'rescued_count' => 4]);
        $island = Island::first();

        // 2 alive
        Citizen::create(['created_by_god_id' => $god->id, 'island_id' => $island->id, 'name' => 'A', 'status' => 'alive']);
        Citizen::create(['created_by_god_id' => $god->id, 'island_id' => $island->id, 'name' => 'B', 'status' => 'alive']);

        // 1 drowned
        Citizen::create(['created_by_god_id' => $god->id, 'island_id' => $island->id, 'name' => 'C', 'status' => 'dead', 'death_reason' => 'drowned']);

        $stats = $god->stats;
        $this->assertEquals(3, $stats['created']);
        $this->assertEquals(2, $stats['alive']);
        $this->assertEquals(4, $stats['rescued']);
        $this->assertEquals(1, $stats['drowned']);
    }

    public function test_island_rename(): void
    {
        $island = Island::first();

        $response = $this->patchJson("/api/islands/{$island->id}", [
            'name' => 'Đảo Bình Minh Mới',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('islands', [
            'id' => $island->id,
            'name' => 'Đảo Bình Minh Mới',
        ]);
    }

    public function test_citizen_creation_with_random_persistent_skin_tone(): void
    {
        $god = God::create(['name' => 'Thần Sáng Tạo']);
        $island = Island::first();

        $response = $this->postJson("/api/islands/{$island->id}/citizens", [
            'name' => 'Minh',
            'god_uuid' => $god->uuid,
        ]);

        $response->assertStatus(201);
        $response->assertJson([
            'status' => 'ok',
            'citizen' => [
                'name' => 'Minh',
                'status' => 'alive',
            ],
            'island_population' => 1,
            'world_population' => 1,
        ]);

        $skinTone = $response->json('citizen.skin_tone');
        $this->assertContains($skinTone, Citizen::SKIN_TONE_PALETTE);

        // Verify persisted in DB
        $this->assertDatabaseHas('citizens', [
            'name' => 'Minh',
            'skin_tone' => $skinTone,
            'island_id' => $island->id,
        ]);
    }

    public function test_citizen_rename(): void
    {
        $god = God::create(['name' => 'Thần']);
        $island = Island::first();
        $citizen = Citizen::create([
            'created_by_god_id' => $god->id,
            'island_id' => $island->id,
            'name' => 'Old Name',
        ]);

        $response = $this->patchJson("/api/citizens/{$citizen->id}", [
            'name' => 'New Name',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('citizens', [
            'id' => $citizen->id,
            'name' => 'New Name',
        ]);
    }

    public function test_citizen_move_between_islands(): void
    {
        $god = God::create(['name' => 'Thần']);
        $islandA = Island::where('slug', 'dao-binh-minh')->first();
        $islandB = Island::where('slug', 'dao-co')->first();

        $citizen = Citizen::create([
            'created_by_god_id' => $god->id,
            'island_id' => $islandA->id,
            'name' => 'Bay Lượn',
        ]);

        $this->assertEquals(1, $islandA->fresh()->population);
        $this->assertEquals(0, $islandB->fresh()->population);

        $response = $this->postJson("/api/citizens/{$citizen->id}/move", [
            'target_island_id' => $islandB->id,
            'position_x' => -28.0,
            'position_z' => -12.0,
        ]);

        $response->assertStatus(200);
        $this->assertEquals(0, $islandA->fresh()->population);
        $this->assertEquals(1, $islandB->fresh()->population);

        $this->assertDatabaseHas('citizens', [
            'id' => $citizen->id,
            'island_id' => $islandB->id,
            'last_island_id' => $islandA->id,
            'status' => 'alive',
        ]);
    }

    public function test_citizen_drowning_maintains_population(): void
    {
        $god = God::create(['name' => 'Thần']);
        $island = Island::first();
        $citizen = Citizen::create([
            'created_by_god_id' => $god->id,
            'island_id' => $island->id,
            'name' => 'Dưới Nước',
            'status' => 'alive',
        ]);

        $this->assertEquals(1, $island->fresh()->population);

        $response = $this->postJson("/api/citizens/{$citizen->id}/drowning");
        $response->assertStatus(200);

        // Required Rule 12 & 29: Entering water / drowning does NOT decrement population yet!
        $this->assertEquals('drowning', $citizen->fresh()->status);
        $this->assertEquals(1, $island->fresh()->population);
        $this->assertEquals(1, Citizen::whereIn('status', ['alive', 'drowning'])->count());
    }

    public function test_citizen_rescue_restores_alive_status_and_increments_god_rescued(): void
    {
        $god = God::create(['name' => 'Thần Cứu Thế', 'rescued_count' => 0]);
        $island = Island::first();
        $citizen = Citizen::create([
            'created_by_god_id' => $god->id,
            'island_id' => $island->id,
            'name' => 'Được Cứu',
            'status' => 'drowning',
        ]);

        $response = $this->postJson("/api/citizens/{$citizen->id}/rescue");
        $response->assertStatus(200);

        $this->assertEquals('alive', $citizen->fresh()->status);
        $this->assertEquals(1, $god->fresh()->rescued_count);
        $this->assertEquals(1, $island->fresh()->population);
    }

    public function test_citizen_drowning_death_decrements_population(): void
    {
        $god = God::create(['name' => 'Thần', 'rescued_count' => 0]);
        $island = Island::first();
        $citizen = Citizen::create([
            'created_by_god_id' => $god->id,
            'island_id' => $island->id,
            'name' => 'Không Kịp Cứu',
            'status' => 'drowning',
        ]);

        $this->assertEquals(1, $island->fresh()->population);

        $response = $this->postJson("/api/citizens/{$citizen->id}/drown");
        $response->assertStatus(200);

        $this->assertEquals('dead', $citizen->fresh()->status);
        $this->assertEquals('drowned', $citizen->fresh()->death_reason);

        // Now confirmed dead: island and world population decremented!
        $this->assertEquals(0, $island->fresh()->population);
        $this->assertEquals(0, Citizen::whereIn('status', ['alive', 'drowning'])->count());
        $this->assertEquals(1, $god->fresh()->stats['drowned']);
    }

    public function test_database_health_endpoint(): void
    {
        $response = $this->getJson('/api/health/database');
        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'ok',
        ]);
    }
}
