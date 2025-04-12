<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\NmiService;
use Exception;

class RegisterDvfWebhook extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'dvf:register-webhook {url?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Display instructions for registering a webhook URL with DVF/NMI';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $url = $this->argument('url') ?? config('app.url') . '/dvf/webhook';
        
        $this->info("To register your DVF webhook URL:");
        $this->line('');
        $this->line("1. Log in to your DVF Solutions merchant portal");
        $this->line("2. Navigate to Settings > Webhooks");
        $this->line("3. Click 'Add Endpoint'");
        $this->line("4. Enter the following URL:");
        $this->line("   $url");
        $this->line("5. Select the transaction event types you want to receive notifications for");
        $this->line("6. Save your changes");
        $this->line('');
        $this->info("Webhook signing key from your .env file:");
        $this->line(env('VOLTMS_WEBHOOK_SIGNING_KEY'));
        $this->line('');
        $this->line("Note: Make sure your webhook endpoint is accessible from the internet");
        $this->line("and that you're using HTTPS with valid TLS encryption.");
        
        return Command::SUCCESS;
    }
}
