<?php

namespace App\Console\Commands;

use App\Services\CitizenLifecycleService;
use Illuminate\Console\Command;

class ReconcileGodCountersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'paradise:reconcile-counters 
                            {--dry-run : Inspect and report drift without mutating database} 
                            {--god= : Specific God ID to reconcile}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reconcile God citizens counters against authoritative citizen records';

    public function __construct(
        public CitizenLifecycleService $lifecycleService
    ) {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $godId = $this->option('god') ? (int) $this->option('god') : null;

        $this->info($dryRun
            ? '🔍 Inspecting God citizen counters (DRY RUN - No changes will be saved)...'
            : '⚙ Reconciling God citizen counters with authoritative database state...'
        );

        $results = $this->lifecycleService->reconcileGodCounters($godId, $dryRun);

        if (empty($results)) {
            $this->warn('No gods found to reconcile.');

            return Command::SUCCESS;
        }

        $rows = [];
        $driftCount = 0;

        foreach ($results as $res) {
            if ($res['drift_detected']) {
                $driftCount++;
            }

            $rows[] = [
                'ID' => $res['id'],
                'Name' => $res['name'],
                'Created (Before -> After)' => "{$res['before']['created']} -> {$res['after']['created']}",
                'Alive (Before -> After)' => "{$res['before']['alive']} -> {$res['after']['alive']}",
                'Drowned (Before -> After)' => "{$res['before']['drowned']} -> {$res['after']['drowned']}",
                'Drift?' => $res['drift_detected'] ? '⚠ DRIFT' : '✓ OK',
            ];
        }

        $this->table(
            ['ID', 'Name', 'Created (Before -> After)', 'Alive (Before -> After)', 'Drowned (Before -> After)', 'Drift?'],
            $rows
        );

        if ($driftCount > 0) {
            if ($dryRun) {
                $this->warn("⚠ Found {$driftCount} God(s) with counter drift. Run without --dry-run to apply corrections.");
            } else {
                $this->info("✓ Successfully reconciled {$driftCount} God(s) with counter drift.");
            }
        } else {
            $this->info('✓ All God counters are already 100% consistent with authoritative citizen state.');
        }

        return Command::SUCCESS;
    }
}
