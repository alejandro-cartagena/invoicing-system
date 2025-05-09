<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class WebhookDataReceived implements ShouldBroadcast
{
    use InteractsWithSockets;

    public $data;

    /**
     * Create a new webhook data event instance.
     * 
     * This event is triggered when webhook data is received from payment providers
     * (e.g., NMI, Bead) to notify the system of payment status updates.
     * 
     * @param array $data The webhook payload containing payment status and transaction details
     */
    public function __construct($data)
    {
        $this->data = $data;
    }

    /**
     * Get the channels the event should broadcast on.
     * 
     * Broadcasts the webhook data to a private channel for secure processing.
     * Only authenticated users with proper permissions can access this channel.
     * 
     * @return \Illuminate\Broadcasting\Channel
     */
    public function broadcastOn()
    {
        return new PrivateChannel('webhook-data');
    }
}
