<?php

namespace App\Console\Commands;

use Database\Seeders\WorldSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ResetWorldCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'world:reset {--fresh : Wipe all tables and re-run migrations}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reset Paradise Gods archipelago to deterministic initial state';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Resetting Paradise Gods world state...');

        if ($this->option('fresh')) {
            $this->call('migrate:fresh', ['--seed' => true]);
        } else {
            Schema::disableForeignKeyConstraints();
            DB::table('citizens')->truncate();
            DB::table('islands')->truncate();
            DB::table('gods')->truncate();
            Schema::enableForeignKeyConstraints();

            $this->call('db:seed', ['--class' => WorldSeeder::class]);
        }

        $this->info('Paradise Gods world successfully reset to deterministic state.');
        return Command::SUCCESS;
    }
}
