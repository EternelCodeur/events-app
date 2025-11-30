@echo off
cd /d "%~dp0"
php artisan schedule:run --no-ansi --no-interaction >> "storage\logs\scheduler.log" 2>&1
