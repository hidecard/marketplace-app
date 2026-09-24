<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

#[Signature('schedule:cleanup')]
#[Description('Run scheduled cleanup tasks')]
class ScheduleCleanup extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Running scheduled cleanup tasks...');

        // Clean up old data (retain 30 days)
        Artisan::call('cleanup:old-data', ['--days' => 30]);
        $this->info(Artisan::output());

        $this->info('Scheduled cleanup completed successfully.');

        return 0;
    }
}
