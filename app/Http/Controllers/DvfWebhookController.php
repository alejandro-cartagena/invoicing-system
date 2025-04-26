<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;
use App\Models\Invoice;

class DvfWebhookController extends Controller
{
    /**
     * Handle incoming webhook from DVF Solutions (NMI)
     *
     * @param Request $request
     * @return \Illuminate\Http\Response
     */
    public function handle(Request $request)
    {
        try {
            // Log the incoming webhook
            Log::info('Received DVF webhook', [
                'headers' => $request->headers->all(),
                'body' => $request->getContent()
            ]);

            // Get the signing key from the environment
            $signingKey = env('VOLTMS_WEBHOOK_SIGNING_KEY');
            
            // Get the webhook body
            $webhookBody = $request->getContent();
            
            // Get the signature header
            $sigHeader = $request->header('Webhook-Signature');
            
            // Check if signature header exists
            if (empty($sigHeader)) {
                Log::warning('Invalid webhook - signature header missing');
                return response()->json(['error' => 'Invalid webhook - signature header missing'], 401);
            }
            
            // Parse the signature header
            if (!preg_match('/t=(.*),s=(.*)/', $sigHeader, $matches)) {
                Log::warning('Unrecognized webhook signature format');
                return response()->json(['error' => 'Unrecognized webhook signature format'], 401);
            }
            
            $nonce = $matches[1];
            $signature = $matches[2];
            
            // Verify the webhook signature
            if (!$this->webhookIsVerified($webhookBody, $signingKey, $nonce, $signature)) {
                Log::warning('Invalid webhook - invalid signature, cannot verify sender');
                return response()->json(['error' => 'Invalid webhook - invalid signature, cannot verify sender'], 401);
            }
            
            // Webhook is verified, continue processing
            Log::info('DVF webhook is verified');
            
            // Parse the webhook body
            $webhook = json_decode($webhookBody, true);
            if (!$webhook) {
                Log::warning('Invalid webhook - unable to parse JSON body');
                return response()->json(['error' => 'Invalid webhook - unable to parse JSON body'], 400);
            }
            
            // Process the webhook based on its type
            if (isset($webhook['type'])) {
                switch ($webhook['type']) {
                    case 'transaction.sale':
                        return $this->handleTransactionSale($webhook);
                    
                    case 'transaction.refund':
                        return $this->handleTransactionRefund($webhook);
                    
                    case 'transaction.void':
                        return $this->handleTransactionVoid($webhook);
                    
                    default:
                        Log::info('Unhandled webhook type: ' . $webhook['type']);
                        return response()->json(['message' => 'Webhook received, but no handler for type: ' . $webhook['type']]);
                }
            }
            
            return response()->json(['message' => 'Webhook received']);
        } catch (Exception $e) {
            Log::error('Failed to process DVF webhook: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Always return 200 OK to prevent retries
            return response()->json(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
    
    /**
     * Verify that the webhook signature is valid
     *
     * @param string $webhookBody
     * @param string $signingKey
     * @param string $nonce
     * @param string $sig
     * @return bool
     */
    private function webhookIsVerified($webhookBody, $signingKey, $nonce, $sig)
    {
        return $sig === hash_hmac("sha256", $nonce . "." . $webhookBody, $signingKey);
    }
    
    /**
     * Handle a transaction.sale webhook
     *
     * @param array $webhook
     * @return \Illuminate\Http\Response
     */
    private function handleTransactionSale($webhook)
    {
        try {
            // Extract the order ID from the webhook
            $orderId = $webhook['data']['orderid'] ?? null;
            
            if (!$orderId) {
                Log::warning('Transaction webhook missing orderid');
                return response()->json(['status' => 'error', 'message' => 'Missing orderid in webhook']);
            }
            
            // Find the invoice by order ID or extraction information from orderid
            // Example: If orderid is in format: invoiceID-timestamp-uniqid
            $parts = explode('-', $orderId);
            $invoiceId = $parts[0] ?? null;
            
            $invoice = null;
            if ($invoiceId) {
                // Try to find by nmi_invoice_id first
                $invoice = Invoice::where('nmi_invoice_id', $invoiceId)->first();
                
            }
            
            if (!$invoice) {
                Log::warning('Cannot find invoice for transaction', [
                    'orderid' => $orderId,
                    'invoiceId' => $invoiceId
                ]);
                return response()->json(['status' => 'error', 'message' => 'Invoice not found']);
            }
            
            // Check if the transaction was successful
            $responseCode = $webhook['data']['response_code'] ?? null;
            $response = $webhook['data']['response'] ?? null;
            
            if ($responseCode == '100' && $response == '1') {
                // Transaction was successful, update the invoice
                $invoice->status = 'paid';
                $invoice->payment_date = now();
                $invoice->transaction_id = $webhook['data']['transactionid'] ?? null;
                $invoice->save();
                
                Log::info('Invoice marked as paid', [
                    'invoice_id' => $invoice->id,
                    'nmi_invoice_id' => $invoice->nmi_invoice_id,
                    'transaction_id' => $invoice->transaction_id
                ]);
                
                return response()->json(['status' => 'success', 'message' => 'Invoice updated to paid']);
            } else {
                // Transaction failed
                Log::info('Transaction failed', [
                    'invoice_id' => $invoice->id,
                    'response_code' => $responseCode,
                    'response' => $response,
                    'response_text' => $webhook['data']['responsetext'] ?? 'No response text'
                ]);
                
                return response()->json(['status' => 'success', 'message' => 'Transaction failure recorded']);
            }
        } catch (Exception $e) {
            Log::error('Error processing transaction.sale webhook: ' . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
    
    /**
     * Handle a transaction.refund webhook
     *
     * @param array $webhook
     * @return \Illuminate\Http\Response
     */
    private function handleTransactionRefund($webhook)
    {
        try {
            // Extract the transaction ID from the webhook
            $transactionId = $webhook['data']['transactionid'] ?? null;
            
            if (!$transactionId) {
                Log::warning('Refund webhook missing transactionid');
                return response()->json(['status' => 'error', 'message' => 'Missing transactionid in webhook']);
            }
            
            // Find the invoice by transaction ID
            $invoice = Invoice::where('transaction_id', $transactionId)->first();
            
            if (!$invoice) {
                Log::warning('Cannot find invoice for refund transaction', [
                    'transactionid' => $transactionId
                ]);
                return response()->json(['status' => 'error', 'message' => 'Invoice not found']);
            }
            
            // Update the invoice status
            $invoice->status = 'refunded';
            $invoice->save();
            
            Log::info('Invoice marked as refunded', [
                'invoice_id' => $invoice->id,
                'nmi_invoice_id' => $invoice->nmi_invoice_id,
                'transaction_id' => $invoice->transaction_id
            ]);
            
            return response()->json(['status' => 'success', 'message' => 'Invoice updated to refunded']);
        } catch (Exception $e) {
            Log::error('Error processing transaction.refund webhook: ' . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
    
    /**
     * Handle a transaction.void webhook
     *
     * @param array $webhook
     * @return \Illuminate\Http\Response
     */
    private function handleTransactionVoid($webhook)
    {
        try {
            // Extract the transaction ID from the webhook
            $transactionId = $webhook['data']['transactionid'] ?? null;
            
            if (!$transactionId) {
                Log::warning('Void webhook missing transactionid');
                return response()->json(['status' => 'error', 'message' => 'Missing transactionid in webhook']);
            }
            
            // Find the invoice by transaction ID
            $invoice = Invoice::where('transaction_id', $transactionId)->first();
            
            if (!$invoice) {
                Log::warning('Cannot find invoice for void transaction', [
                    'transactionid' => $transactionId
                ]);
                return response()->json(['status' => 'error', 'message' => 'Invoice not found']);
            }
            
            // Update the invoice status
            $invoice->status = 'voided';
            $invoice->save();
            
            Log::info('Invoice marked as voided', [
                'invoice_id' => $invoice->id,
                'nmi_invoice_id' => $invoice->nmi_invoice_id,
                'transaction_id' => $invoice->transaction_id
            ]);
            
            return response()->json(['status' => 'success', 'message' => 'Invoice updated to voided']);
        } catch (Exception $e) {
            Log::error('Error processing transaction.void webhook: ' . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
}
