<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\BeadPaymentService;
use Exception;

class RegisterBeadWebhook extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'bead:register-webhook {url?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Register a webhook URL with Bead payment service';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $url = $this->argument('url') ?? config('app.url') . '/bead/webhook';
        
        $this->info("Registering webhook URL: $url");
        
        try {
            $beadService = new BeadPaymentService();
            $response = $beadService->setWebhookUrl($url);
            
            $this->info("Webhook registered successfully!");
            $this->table(['Terminal ID', 'Webhook URL', 'Updated'], [
                [$response['terminalId'], $response['webhookUrl'], $response['updated']]
            ]);
            
            return Command::SUCCESS;
        } catch (Exception $e) {
            $this->error("Failed to register webhook: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
