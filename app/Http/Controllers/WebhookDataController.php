<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;

class WebhookDataController extends Controller
{
    /**
     * Maximum number of webhook records to store
     */
    private const MAX_STORED_WEBHOOKS = 50;

    /**
     * Store the webhook data for later retrieval
     *
     * @param array $webhookData
     * @param string $status
     * @return void
     */
    public static function storeWebhook($webhookData, $status = 'received')
    {
        try {
            // Store in cache using a list structure
            $cacheKey = 'dvf_webhooks';
            $allWebhooks = Cache::get($cacheKey, []);
            
            // Prepare webhook data for storage
            $webhookEntry = [
                'id' => $webhookData['event_id'] ?? $webhookData['id'] ?? uniqid(),
                'timestamp' => now()->toIso8601String(),
                'type' => $webhookData['event_type'] ?? $webhookData['type'] ?? 'unknown',
                'status' => $status,
                'data' => $webhookData,
                'invoice_id' => null,
                'user_id' => null
            ];
            
            // If we have invoice info, store it
            if (isset($webhookData['_processed_invoice'])) {
                $webhookEntry['invoice_id'] = $webhookData['_processed_invoice']['id'] ?? null;
                $webhookEntry['user_id'] = $webhookData['_processed_invoice']['user_id'] ?? null;
            }
            
            // Add to the beginning of the array
            array_unshift($allWebhooks, $webhookEntry);
            
            // Keep only the most recent webhooks
            if (count($allWebhooks) > self::MAX_STORED_WEBHOOKS) {
                $allWebhooks = array_slice($allWebhooks, 0, self::MAX_STORED_WEBHOOKS);
            }
            
            // Store back in cache
            Cache::put($cacheKey, $allWebhooks, now()->addDays(7));
            
            Log::info('Webhook data stored for frontend access', [
                'webhook_id' => $webhookEntry['id'],
                'type' => $webhookEntry['type']
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to store webhook data: ' . $e->getMessage());
        }
    }

    /**
     * Get recent webhook data for the user interface
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getRecentWebhooks()
    {
        try {
            // Get all stored webhooks
            $allWebhooks = Cache::get('dvf_webhooks', []);
            
            // If user is not admin, filter to only show webhooks for their user ID
            if (!Auth::user()->is_admin) {
                $userId = Auth::id();
                $allWebhooks = array_filter($allWebhooks, function($webhook) use ($userId) {
                    return $webhook['user_id'] == $userId;
                });
            }
            
            return response()->json([
                'status' => 'success',
                'webhooks' => array_values($allWebhooks) // Re-index array
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve webhook data: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Clear stored webhooks
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function clearWebhooks()
    {
        try {
            // Only admins can clear all webhooks
            if (Auth::user()->is_admin) {
                Cache::forget('dvf_webhooks');
                return response()->json(['status' => 'success', 'message' => 'All webhooks cleared']);
            }
            
            return response()->json(['status' => 'error', 'message' => 'Permission denied'], 403);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error', 
                'message' => 'Failed to clear webhooks: ' . $e->getMessage()
            ], 500);
        }
    }
}
