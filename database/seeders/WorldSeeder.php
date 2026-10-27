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
     * Seed deterministic islands, demo god, and initial citizens for Paradise Gods.
     */
    public function run(): void
    {
        // 1. Seed or find default demo God
        $god = God::firstOrCreate(
            ['name' => 'Thần Huynh'],
            [
                'uuid' => '11111111-2222-3333-4444-555555555555',
                'rescued_count' => 5,
            ]
        );

        // 2. Define 10 archipelago islands
        $islandsData = [
            [
                'name' => 'Đảo Bình Minh',
                'slug' => 'dao-binh-minh',
                'world_x' => 0.0,
                'world_z' => 0.0,
                'radius' => 14.0,
                'type' => 'capital',
                'seed' => 101,
            ],
            [
                'name' => 'Đảo Cọ',
                'slug' => 'dao-co',
                'world_x' => -28.0,
                'world_z' => -12.0,
                'radius' => 10.5,
                'type' => 'palms',
                'seed' => 102,
            ],
            [
                'name' => 'Đảo Hải Đăng',
                'slug' => 'dao-hai-dang',
                'world_x' => 28.0,
                'world_z' => -14.0,
                'radius' => 9.5,
                'type' => 'lighthouse',
                'seed' => 103,
            ],
            [
                'name' => 'Đảo Xanh',
                'slug' => 'dao-xanh',
                'world_x' => 18.0,
                'world_z' => 24.0,
                'radius' => 12.0,
                'type' => 'forest',
                'seed' => 104,
            ],
            [
                'name' => 'Đảo Mặt Trăng',
                'slug' => 'dao-mat-trang',
                'world_x' => -24.0,
                'world_z' => 20.0,
                'radius' => 11.0,
                'type' => 'crescent',
                'seed' => 105,
            ],
            [
                'name' => 'Bến Thiên Đường',
                'slug' => 'ben-thien-duong',
                'world_x' => -4.0,
                'world_z' => -28.0,
                'radius' => 12.5,
                'type' => 'harbor',
                'seed' => 106,
            ],
            [
                'name' => 'Đảo Gió',
                'slug' => 'dao-gio',
                'world_x' => 34.0,
                'world_z' => 12.0,
                'radius' => 10.0,
                'type' => 'windy',
                'seed' => 107,
            ],
            [
                'name' => 'Đảo San Hô',
                'slug' => 'dao-san-ho',
                'world_x' => -36.0,
                'world_z' => 6.0,
                'radius' => 11.0,
                'type' => 'coral',
                'seed' => 108,
            ],
            [
                'name' => 'Đảo Hoàng Hôn',
                'slug' => 'dao-hoang-hon',
                'world_x' => -14.0,
                'world_z' => 38.0,
                'radius' => 10.5,
                'type' => 'sunset',
                'seed' => 109,
            ],
            [
                'name' => 'Đảo Núi Lửa Ngủ',
                'slug' => 'dao-nui-lua-ngu',
                'world_x' => 14.0,
                'world_z' => -38.0,
                'radius' => 11.5,
                'type' => 'mountain',
                'seed' => 110,
            ],
        ];

        $islands = [];
        foreach ($islandsData as $data) {
            $islands[$data['slug']] = Island::updateOrCreate(
                ['slug' => $data['slug']],
                $data
            );
        }

        // 3. Seed initial living citizens spread over islands
        $citizensData = [
            // On Đảo Bình Minh (Center Capital)
            ['name' => 'Minh', 'island' => 'dao-binh-minh', 'x' => -2.5, 'z' => 1.5, 'skin' => '#E8C2A4', 'cloth' => '#3b82f6'],
            ['name' => 'Linh', 'island' => 'dao-binh-minh', 'x' => 3.0, 'z' => -2.0, 'skin' => '#F2D6CB', 'cloth' => '#ec4899'],
            ['name' => 'An', 'island' => 'dao-binh-minh', 'x' => 1.0, 'z' => 4.0, 'skin' => '#DFAF83', 'cloth' => '#10b981'],
            ['name' => 'Duy', 'island' => 'dao-binh-minh', 'x' => -4.0, 'z' => -3.0, 'skin' => '#C98E64', 'cloth' => '#f59e0b'],
            ['name' => 'Hương', 'island' => 'dao-binh-minh', 'x' => 4.5, 'z' => 2.0, 'skin' => '#AB6B47', 'cloth' => '#8b5cf6'],

            // On Đảo Cọ
            ['name' => 'Khoa', 'island' => 'dao-co', 'x' => -28.0, 'z' => -10.0, 'skin' => '#875137', 'cloth' => '#ef4444'],
            ['name' => 'Mai', 'island' => 'dao-co', 'x' => -25.5, 'z' => -13.0, 'skin' => '#F2D6CB', 'cloth' => '#06b6d4'],
            ['name' => 'Tâm', 'island' => 'dao-co', 'x' => -30.0, 'z' => -11.5, 'skin' => '#633B2A', 'cloth' => '#14b8a6'],

            // On Đảo Hải Đăng
            ['name' => 'Phong', 'island' => 'dao-hai-dang', 'x' => 27.5, 'z' => -13.0, 'skin' => '#DFAF83', 'cloth' => '#3b82f6'],
            ['name' => 'Bình', 'island' => 'dao-hai-dang', 'x' => 29.5, 'z' => -15.5, 'skin' => '#C98E64', 'cloth' => '#f59e0b'],

            // On Đảo Xanh
            ['name' => 'Thảo', 'island' => 'dao-xanh', 'x' => 17.0, 'z' => 23.0, 'skin' => '#E8C2A4', 'cloth' => '#10b981'],
            ['name' => 'Quân', 'island' => 'dao-xanh', 'x' => 19.5, 'z' => 25.5, 'skin' => '#AB6B47', 'cloth' => '#ef4444'],

            // On Bến Thiên Đường
            ['name' => 'Hải', 'island' => 'ben-thien-duong', 'x' => -3.0, 'z' => -26.5, 'skin' => '#F2D6CB', 'cloth' => '#3b82f6'],
            ['name' => 'Yến', 'island' => 'ben-thien-duong', 'x' => -5.5, 'z' => -29.0, 'skin' => '#875137', 'cloth' => '#ec4899'],
        ];

        foreach ($citizensData as $c) {
            $island = $islands[$c['island']] ?? null;
            if (! $island) continue;

            Citizen::firstOrCreate(
                [
                    'name' => $c['name'],
                    'island_id' => $island->id,
                ],
                [
                    'created_by_god_id' => $god->id,
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
    }
}
