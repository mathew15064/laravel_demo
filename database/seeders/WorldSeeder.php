<?php

namespace Database\Seeders;

use App\Models\Citizen;
use App\Models\God;
use App\Models\Island;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WorldSeeder extends Seeder
{
    /**
     * Seed deterministic islands, canonical gods, and initial citizens for Paradise Gods.
     */
    public function run(): void
    {
        // 1. Initialize world_states
        DB::table('world_states')->updateOrInsert(
            ['id' => 1],
            [
                'world_version' => 1000,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // 2. Canonical Gods
        $godsConfig = [
            [
                'name' => 'Zeus',
                'uuid' => '11111111-2222-3333-4444-555555555555',
                'god_color' => '#8b5cf6', // violet aura
                'rescued_count' => 5,
                'other_gods_rescued_count' => 3,
                'rescued_by_others_count' => 1,
            ],
            [
                'name' => 'Athena',
                'uuid' => '22222222-3333-4444-5555-666666666666',
                'god_color' => '#06b6d4', // cyan aura
                'rescued_count' => 4,
                'other_gods_rescued_count' => 2,
                'rescued_by_others_count' => 0,
            ],
            [
                'name' => 'Ares',
                'uuid' => '33333333-4444-5555-6666-777777777777',
                'god_color' => '#ef4444', // red aura
                'rescued_count' => 2,
                'other_gods_rescued_count' => 1,
                'rescued_by_others_count' => 2,
            ],
            [
                'name' => 'Apollo',
                'uuid' => '44444444-5555-6666-7777-888888888888',
                'god_color' => '#f59e0b', // golden aura
                'rescued_count' => 3,
                'other_gods_rescued_count' => 2,
                'rescued_by_others_count' => 1,
            ],
        ];

        $seededGods = [];
        foreach ($godsConfig as $cfg) {
            $seededGods[$cfg['name']] = God::updateOrCreate(
                ['uuid' => $cfg['uuid']],
                [
                    'name' => $cfg['name'],
                    'god_color' => $cfg['god_color'],
                    'rescued_count' => $cfg['rescued_count'],
                    'other_gods_rescued_count' => $cfg['other_gods_rescued_count'],
                    'rescued_by_others_count' => $cfg['rescued_by_others_count'],
                    'last_seen_at' => now(),
                ]
            );
        }

        $zeus = $seededGods['Zeus'];
        $athena = $seededGods['Athena'];

        // 3. Define 10 archipelago islands (Cooperative shared world - no ownership)
        $islandsData = [
            [
                'name' => 'Đảo Bình Minh',
                'slug' => 'dao-binh-minh',
                'world_x' => 0.0,
                'world_z' => 0.0,
                'radius' => 14.0,
                'type' => 'capital',
                'seed' => 101,
                'governed_by_god_id' => null,
                'banner_name' => null,
            ],
            [
                'name' => 'Đảo Cọ',
                'slug' => 'dao-co',
                'world_x' => -28.0,
                'world_z' => -12.0,
                'radius' => 10.5,
                'type' => 'palms',
                'seed' => 102,
                'governed_by_god_id' => null,
                'banner_name' => null,
            ],
            [
                'name' => 'Đảo Hải Đăng',
                'slug' => 'dao-hai-dang',
                'world_x' => 28.0,
                'world_z' => -14.0,
                'radius' => 9.5,
                'type' => 'lighthouse',
                'seed' => 103,
                'governed_by_god_id' => null,
                'banner_name' => null,
            ],
            [
                'name' => 'Đảo Xanh',
                'slug' => 'dao-xanh',
                'world_x' => 18.0,
                'world_z' => 24.0,
                'radius' => 12.0,
                'type' => 'forest',
                'seed' => 104,
                'governed_by_god_id' => null,
                'banner_name' => null,
            ],
            [
                'name' => 'Đảo Mặt Trăng',
                'slug' => 'dao-mat-trang',
                'world_x' => -24.0,
                'world_z' => 20.0,
                'radius' => 11.0,
                'type' => 'crescent',
                'seed' => 105,
                'governed_by_god_id' => null,
                'banner_name' => null,
            ],
            [
                'name' => 'Bến Thiên Đường',
                'slug' => 'ben-thien-duong',
                'world_x' => -4.0,
                'world_z' => -28.0,
                'radius' => 12.5,
                'type' => 'harbor',
                'seed' => 106,
                'governed_by_god_id' => null,
                'banner_name' => null,
            ],
            [
                'name' => 'Đảo Gió',
                'slug' => 'dao-gio',
                'world_x' => 34.0,
                'world_z' => 12.0,
                'radius' => 10.0,
                'type' => 'windy',
                'seed' => 107,
                'governed_by_god_id' => null,
                'banner_name' => null,
            ],
            [
                'name' => 'Đảo San Hô',
                'slug' => 'dao-san-ho',
                'world_x' => -36.0,
                'world_z' => 6.0,
                'radius' => 11.0,
                'type' => 'coral',
                'seed' => 108,
                'governed_by_god_id' => null,
                'banner_name' => null,
            ],
            [
                'name' => 'Đảo Hoàng Hôn',
                'slug' => 'dao-hoang-hon',
                'world_x' => -14.0,
                'world_z' => 38.0,
                'radius' => 10.5,
                'type' => 'sunset',
                'seed' => 109,
                'governed_by_god_id' => null,
                'banner_name' => null,
            ],
            [
                'name' => 'Đảo Núi Lửa Ngủ',
                'slug' => 'dao-nui-lua-ngu',
                'world_x' => 14.0,
                'world_z' => -38.0,
                'radius' => 11.5,
                'type' => 'mountain',
                'seed' => 110,
                'governed_by_god_id' => null,
                'banner_name' => null,
            ],
        ];

        $islands = [];
        foreach ($islandsData as $data) {
            $islands[$data['slug']] = Island::updateOrCreate(
                ['slug' => $data['slug']],
                $data
            );
        }

        // 4. Seed initial living citizens spread over islands
        $citizensData = [
            // On Đảo Bình Minh (Center Capital) - Zeus creator
            ['name' => 'Minh', 'island' => 'dao-binh-minh', 'x' => -2.5, 'z' => 1.5, 'skin' => '#E8C2A4', 'cloth' => '#3b82f6', 'god' => $zeus],
            ['name' => 'Linh', 'island' => 'dao-binh-minh', 'x' => 3.0, 'z' => -2.0, 'skin' => '#F2D6CB', 'cloth' => '#ec4899', 'god' => $zeus],
            ['name' => 'An', 'island' => 'dao-binh-minh', 'x' => 1.0, 'z' => 4.0, 'skin' => '#DFAF83', 'cloth' => '#10b981', 'god' => $zeus],
            ['name' => 'Duy', 'island' => 'dao-binh-minh', 'x' => -4.0, 'z' => -3.0, 'skin' => '#C98E64', 'cloth' => '#f59e0b', 'god' => $zeus],
            ['name' => 'Hương', 'island' => 'dao-binh-minh', 'x' => 4.5, 'z' => 2.0, 'skin' => '#AB6B47', 'cloth' => '#8b5cf6', 'god' => $zeus],

            // On Đảo Cọ - Athena creator
            ['name' => 'Khoa', 'island' => 'dao-co', 'x' => -28.0, 'z' => -10.0, 'skin' => '#875137', 'cloth' => '#ef4444', 'god' => $athena],
            ['name' => 'Mai', 'island' => 'dao-co', 'x' => -25.5, 'z' => -13.0, 'skin' => '#F2D6CB', 'cloth' => '#06b6d4', 'god' => $athena],
            ['name' => 'Tâm', 'island' => 'dao-co', 'x' => -30.0, 'z' => -11.5, 'skin' => '#633B2A', 'cloth' => '#14b8a6', 'god' => $athena],

            // On Đảo Hải Đăng
            ['name' => 'Phong', 'island' => 'dao-hai-dang', 'x' => 27.5, 'z' => -13.0, 'skin' => '#DFAF83', 'cloth' => '#3b82f6', 'god' => $zeus],
            ['name' => 'Bình', 'island' => 'dao-hai-dang', 'x' => 29.5, 'z' => -15.5, 'skin' => '#C98E64', 'cloth' => '#f59e0b', 'god' => $athena],

            // On Đảo Xanh
            ['name' => 'Thảo', 'island' => 'dao-xanh', 'x' => 17.0, 'z' => 23.0, 'skin' => '#E8C2A4', 'cloth' => '#10b981', 'god' => $zeus],
            ['name' => 'Quân', 'island' => 'dao-xanh', 'x' => 19.5, 'z' => 25.5, 'skin' => '#AB6B47', 'cloth' => '#ef4444', 'god' => $athena],

            // On Bến Thiên Đường
            ['name' => 'Hải', 'island' => 'ben-thien-duong', 'x' => -3.0, 'z' => -26.5, 'skin' => '#F2D6CB', 'cloth' => '#3b82f6', 'god' => $zeus],
            ['name' => 'Yến', 'island' => 'ben-thien-duong', 'x' => -5.5, 'z' => -29.0, 'skin' => '#875137', 'cloth' => '#ec4899', 'god' => $athena],
        ];

        foreach ($citizensData as $c) {
            $island = $islands[$c['island']] ?? null;
            if (! $island) {
                continue;
            }

            Citizen::updateOrCreate(
                [
                    'name' => $c['name'],
                    'island_id' => $island->id,
                ],
                [
                    'created_by_god_id' => $c['god']->id,
                    'status' => 'alive',
                    'skin_tone' => $c['skin'],
                    'clothing_color' => $c['cloth'],
                    'position_x' => $c['x'],
                    'position_y' => 0.0,
                    'position_z' => $c['z'],
                    'last_island_id' => $island->id,
                ]
            );
        }

        // 5. Update initial stats for all gods
        foreach (God::all() as $g) {
            $g->update([
                'citizens_created_count' => $g->citizens()->count(),
                'citizens_alive_count' => $g->citizens()->where('status', 'alive')->count(),
                'citizens_drowned_count' => $g->citizens()->where('status', 'dead')->where('death_reason', 'drowned')->count(),
            ]);
        }
    }
}
