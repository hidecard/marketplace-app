<?php

namespace App\Console\Commands;

use App\Models\InventoryMovement;
use App\Models\MarketplaceNotification;
use App\Models\VerificationRequest;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('cleanup:old-data {--days=30 : Number of days to retain data}')]
#[Description('Clean up old data including operation locks, notifications, and rejected evidence')]
class CleanupOldData extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $days = (int) $this->option('days');
        $cutoffDate = now()->subDays($days);

        $this->info("Cleaning up data older than {$days} days (before {$cutoffDate->toDateString()})...");

        $stats = [
            'notifications' => $this->cleanupNotifications($cutoffDate),
            'rejected_evidence' => $this->cleanupRejectedEvidence($cutoffDate),
            'old_inventory_movements' => $this->cleanupOldInventoryMovements($cutoffDate),
        ];

        $this->info('Cleanup completed:');
        foreach ($stats as $type => $count) {
            $this->line("  - {$type}: {$count} records deleted");
        }

        return 0;
    }

    private function cleanupNotifications($cutoffDate): int
    {
        $deleted = MarketplaceNotification::where('read', true)
            ->where('created_at', '<', $cutoffDate)
            ->delete();

        if ($deleted > 0) {
            $this->info("Deleted {$deleted} read notifications older than {$cutoffDate}");
        }

        return $deleted;
    }

    private function cleanupRejectedEvidence($cutoffDate): int
    {
        $deleted = VerificationRequest::where('status', 'rejected')
            ->where('updated_at', '<', $cutoffDate)
            ->delete();

        if ($deleted > 0) {
            $this->info("Deleted {$deleted} rejected verification requests older than {$cutoffDate}");
        }

        return $deleted;
    }

    private function cleanupOldInventoryMovements($cutoffDate): int
    {
        // Keep only the last 90 days of inventory movements
        $movementCutoff = now()->subDays(90);

        $deleted = InventoryMovement::where('created_at', '<', $movementCutoff)
            ->delete();

        if ($deleted > 0) {
            $this->info("Deleted {$deleted} inventory movements older than 90 days");
        }

        return $deleted;
    }
}
