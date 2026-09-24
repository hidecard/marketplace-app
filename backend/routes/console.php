<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule cleanup tasks to run daily at midnight
Schedule::command('schedule:cleanup')->dailyAt('00:00')->description('Clean up old data');
