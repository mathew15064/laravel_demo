<?php

namespace Database\Seeders;

use App\Models\Inquiry;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        Inquiry::firstOrCreate(
            ['email' => 'alex.ops@infrastructure.io'],
            [
                'name' => 'Alex Mercer',
                'message' => 'Interested in the Apache vs PHP-FPM socket starvation workshop module.',
            ]
        );

        Inquiry::firstOrCreate(
            ['email' => 'sam.lead@cloudstack.dev'],
            [
                'name' => 'Samira Chen',
                'message' => 'Attending for the Redis connection pool failure and MySQL lock troubleshooting session.',
            ]
        );
    }
}
