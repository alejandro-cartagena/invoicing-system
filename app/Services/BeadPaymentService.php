<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\PaymentReceiptMail;
use App\Mail\MerchantPaymentReceiptMail;
class BeadPaymentService
{
    private $accessToken;
    private $apiUrl;
    private $authUrl;
    private $terminalId;
    private $username;
    private $password;
    private $merchantId;

    public function __construct($beadCredentials = null)
    {
        $this->apiUrl = config('services.bead.api_url', env('BEAD_API_URL'));
        $this->authUrl = config('services.bead.auth_url', env('BEAD_AUTH_URL'));

        if ($beadCredentials) {
            // Use credentials from database
            $this->terminalId = $beadCredentials->terminal_id;
            $this->username = $beadCredentials->username;
            $this->password = $beadCredentials->password; // This will be decrypted via the accessor
            $this->merchantId = $beadCredentials->merchant_id;
        } else {
            // Fallback to .env values (for backward compatibility)
            $this->terminalId = config('services.bead.terminal_id', env('BEAD_TERMINAL_ID'));
            $this->username = config('services.bead.username', env('BEAD_USERNAME'));
            $this->password = config('services.bead.password', env('BEAD_PASSWORD'));
            $this->merchantId = config('services.bead.merchant_id', env('BEAD_MERCHANT_ID'));
        }

        if (empty($this->authUrl) || empty($this->terminalId) || empty($this->password)) {
            throw new Exception('Bead API configuration is incomplete. Please check your credentials.');
        }
    }

    /**
     * Authenticate with Bead API and get access token
     */
    public function authenticate()
    {
        try {
            Log::info('Attempting to authenticate with Bead API', [
                'auth_url' => $this->authUrl,
                'username' => $this->username,
                'has_password' => !empty($this->password),
                'password_chars' => strlen($this->password),
                'client_id' => 'bead-terminal'
            ]);

            // Try with cURL for more control over the request
            $ch = curl_init($this->authUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
                'grant_type' => 'password',
                'client_id' => 'bead-terminal',
                'username' => $this->username,
                'password' => $this->password,
                'scope' => 'openid profile email'
            ]));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/x-www-form-urlencoded',
                'Accept: application/json'
            ]);
            
            $responseBody = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            Log::info('Auth response received (cURL)', [
                'status' => $httpCode,
                'response_length' => strlen($responseBody),
                'curl_error' => $error
            ]);

            if ($httpCode >= 200 && $httpCode < 300 && !$error) {
                $data = json_decode($responseBody, true);
                
                if (!isset($data['access_token'])) {
                    throw new Exception('Access token not found in response: ' . json_encode($data));
                }

                $this->accessToken = $data['access_token'];
                
                Log::info('Successfully authenticated with Bead API', [
                    'token_length' => strlen($this->accessToken),
                    'token_first_20_chars' => substr($this->accessToken, 0, 20) . '...'
                ]);

                return $this->accessToken;
            }

            Log::error('Bead API Authentication failed', [
                'status' => $httpCode,
                'response' => $responseBody,
                'curl_error' => $error
            ]);

            throw new Exception('Failed to authenticate with Bead API: ' . $responseBody);
        } catch (Exception $e) {
            Log::error('Bead API Authentication error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get the current access token or authenticate to get a new one
     */
    public function getAccessToken()
    {
        if (!$this->accessToken) {
            return $this->authenticate();
        }
        return $this->accessToken;
    }

    /**
     * Create a crypto payment
     */
    public function createCryptoPayment($amount, $currency, $orderId, $description)
    {
        try {
            if (!$this->accessToken) {
                Log::info('No access token found, attempting authentication');
                $this->authenticate();
            }

            $requestedAmount = floatval($amount);
            
            $redirectUrl = 'http://localhost:8000';
            
            // Use merchant_id from credentials
            $payload = [
                'merchantId' => $this->merchantId,
                'terminalId' => $this->terminalId,
                'requestedAmount' => $requestedAmount,
                'paymentUrlType' => 'web',
                'reference' => $orderId,
                'redirectUrl' => $redirectUrl . '/payment-success?reference=' . $orderId
            ];

            // Log full payload and credentials for debugging
            Log::info('Creating Bead crypto payment', [
                'payload' => $payload,
                'api_url' => $this->apiUrl,
                'full_url' => $this->apiUrl . '/payments/crypto',
                'access_token_first_20_chars' => substr($this->accessToken, 0, 20) . '...'
            ]);
            
            // Create authorization header exactly as shown in documentation
            $authHeader = 'Bearer ' . $this->accessToken;
            
            // Use cURL instead of Http client to ensure exact header format
            $ch = curl_init($this->apiUrl . '/payments/crypto');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: ' . $authHeader,
                'api-version: 0.2',
                'Content-Type: application/json',
                'Accept: application/json'
            ]);
            
            $responseBody = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);
            
            Log::info('Bead API Raw Response (cURL)', [
                'status' => $httpCode,
                'body' => $responseBody,
                'curl_error' => $error
            ]);

            if ($httpCode >= 200 && $httpCode < 300) {
                $responseData = json_decode($responseBody, true);
                Log::info('Successfully created Bead crypto payment', [
                    'response' => $responseData
                ]);
                return $responseData;
            }

            // Get more detailed error information
            $errorMessage = 'Failed to create crypto payment: ';
            if (!empty($responseBody)) {
                try {
                    $errorData = json_decode($responseBody, true);
                    $errorMessage .= isset($errorData['message']) ? $errorData['message'] : $responseBody;
                } catch (\Exception $e) {
                    $errorMessage .= $responseBody;
                }
            } else {
                $errorMessage .= 'API returned ' . $httpCode;
            }

            Log::error('Failed to create Bead crypto payment', [
                'status' => $httpCode,
                'response' => json_decode($responseBody, true),
                'error_body' => $responseBody,
                'request_payload' => $payload,
                'api_url' => $this->apiUrl . '/payments/crypto'
            ]);

            throw new Exception($errorMessage);
        } catch (Exception $e) {
            Log::error('Bead API Payment error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Check payment status using tracking ID
     */
    public function checkPaymentStatus($trackingId)
    {
        try {
            if (!$this->accessToken) {
                $this->authenticate();
            }

            // Initialize cURL request to get payment status
            $ch = curl_init("{$this->apiUrl}/payments/tracking/{$trackingId}");
            
            // Set cURL options
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $this->accessToken,
                    'Accept: application/json',
                    'api-version: 0.2'
                ]
            ]);
            
            // Execute the request
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            
            curl_close($ch);
            
            // Log the response for debugging
            Log::info('Bead Payment Status Response', [
                'tracking_id' => $trackingId,
                'http_code' => $httpCode,
                'response' => $response,
                'curl_error' => $error
            ]);

            // Check for cURL errors
            if ($error) {
                throw new Exception('Error connecting to Bead API: ' . $error);
            }

            // Decode the JSON response
            $statusData = json_decode($response, true);
            
            // Add detailed logging of the raw response data
            Log::info('Raw Bead Payment Status Data:', [
                'status_data' => $statusData
            ]);

            if ($httpCode !== 200) {
                throw new Exception('Bead API returned error: ' . ($statusData['message'] ?? 'Unknown error'));
            }

            return [
                'success' => true,
                'status_code' => $statusData['statusCode'] ?? null,
                'status_description' => $this->getStatusDescription($statusData['statusCode'] ?? null),
                'amounts' => $statusData['amounts'] ?? null,
                'completed_at' => $statusData['completedAt'] ?? null,
                'reference' => $statusData['reference'] ?? null,
                'trackingId' => $statusData['trackingId'] ?? null,
                'pageId' => $statusData['pageId'] ?? null
            ];

        } catch (Exception $e) {
            Log::error('Failed to get Bead payment status: ' . $e->getMessage(), [
                'tracking_id' => $trackingId,
                'trace' => $e->getTraceAsString()
            ]);
            
            throw $e;
        }
    }

    /**
     * Get human-readable description for Bead status codes
     */
    private function getStatusDescription($statusCode) {
        $statusDescriptions = [
            2 => 'Completed - The customer sent the requested amount and processing was successful.',
            3 => 'Underpaid - The customer sent less than the requested amount.',
            4 => 'Overpaid - The customer sent more than the requested amount.',
            7 => 'Expired - The customer\'s funds were not received before the payment window expired.',
            8 => 'Invalid - An irregular event occurred during processing.',
            9 => 'Cancelled - The customer or merchant requested to cancel the payment.'
        ];

        return $statusDescriptions[$statusCode] ?? 'Unknown status';
    }

    public function handleBeadWebhook(Request $request)
    {
        try {
            Log::info('Processing Bead webhook', [
                'payload' => $request->all()
            ]);

            $trackingId = $request->input('trackingId');

            if (!$trackingId) {
                throw new Exception('Tracking ID not found in webhook');
            }

            // Get payment status
            $paymentData = $this->checkPaymentStatus($trackingId);

            // Find the invoice by Bead payment ID (which is the trackingId)
            $invoice = Invoice::where('bead_payment_id', $trackingId)->first();
            if (!$invoice) {
                throw new Exception('Invoice not found for tracking ID: ' . $trackingId);
            }

            // Log payment data for debugging and tracking
            Log::info('Processing Bead payment webhook data', [
                'tracking_id' => $trackingId,
                'payment_data' => $paymentData,
                'invoice_id' => $invoice->id
            ]);

            // Update invoice status based on statusCode
            $statusCode = $paymentData['status_code'];
            switch ($statusCode) {
                case "completed": // Payment Completed
                    $invoice->status = 'paid';
                    $invoice->payment_date = now();
                    $invoice->transaction_id = $request->input('paymentCode');

                    // Dispatch payment notification event
                    $notificationData = [
                        'invoice_id' => $invoice->id,
                        'nmi_invoice_id' => $invoice->nmi_invoice_id,
                        'client_email' => $invoice->client_email,
                        'amount' => $invoice->total,
                        'transaction_id' => $request->input('paymentCode'),
                        'status' => 'success',
                        'payment_date' => now()->toDateTimeString(),
                    ];
                    event(new \App\Events\PaymentNotification($notificationData));

                    break;
                case "underpaid": // Payment Underpaid
                    $invoice->status = 'underpaid';
                    break;
                case "overpaid": // Payment Overpaid
                    $invoice->status = 'paid';
                    $invoice->payment_date = now();
                    $invoice->transaction_id = $request->input('paymentCode');
                    // You might want to note the overpayment
                    $invoice->notes = 'Payment was overpaid. Customer should reclaim excess funds.';
                    break;
                case "expired": // Payment Expired
                    $invoice->status = 'expired';
                    break;
                case "invalid": // Payment Invalid
                    $invoice->status = 'invalid';
                    break;
                case "cancelled": // Payment Cancelled
                    $invoice->status = 'cancelled';
                    break;
                default:
                    Log::warning('Unknown payment status code received', [
                        'statusCode' => $statusCode,
                        'trackingId' => $trackingId
                    ]);
            }

            $invoice->save();
            
            // Always return 200 OK to acknowledge receipt
            return response()->json(['success' => true]);
        } catch (Exception $e) {
            // Log the error but still return 200 to prevent retries
            Log::error('Failed to process Bead webhook: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            // Return 200 even on error to prevent Bead from retrying
            return response()->json(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Get the terminal ID (for debugging purposes)
     */
    public function getTerminalId()
    {
        return $this->terminalId;
    }

    public function setWebhookUrl($webhookUrl)
    {
        if (!$this->accessToken) {
            $this->authenticate();
        }
        
        try {
            Log::info('Attempting to set Bead webhook URL', [
                'webhook_url' => $webhookUrl,
                'terminal_id' => $this->terminalId,
                'api_url' => $this->apiUrl . '/Terminals/' . $this->terminalId . '/set-webhook-url'
            ]);
            
            // Use cURL for more control and debugging
            $ch = curl_init($this->apiUrl . '/Terminals/' . $this->terminalId . '/set-webhook-url');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['Url' => $webhookUrl]));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $this->accessToken,
                'Content-Type: application/json',
                'Accept: application/json'
            ]);
            
            // Enable verbose debugging
            curl_setopt($ch, CURLOPT_VERBOSE, true);
            $verbose = fopen('php://temp', 'w+');
            curl_setopt($ch, CURLOPT_STDERR, $verbose);
            
            $responseBody = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            
            // Get verbose information
            rewind($verbose);
            $verboseLog = stream_get_contents($verbose);
            fclose($verbose);
            
            curl_close($ch);
            
            Log::info('Bead webhook setting response details', [
                'status_code' => $httpCode,
                'response_body' => $responseBody,
                'curl_error' => $error,
                'verbose_log' => $verboseLog
            ]);
            
            if ($httpCode >= 200 && $httpCode < 300) {
                $responseData = !empty($responseBody) ? json_decode($responseBody, true) : ['message' => 'Success (empty response)'];
                return $responseData;
            }
            
            // Construct a meaningful error message
            $errorDetail = !empty($responseBody) ? $responseBody : 'Empty response with status code ' . $httpCode;
            if ($error) {
                $errorDetail .= ' CURL Error: ' . $error;
            }
            
            throw new Exception('Failed to set webhook URL: ' . $errorDetail);
        } catch (Exception $e) {
            Log::error('Bead API Webhook Configuration error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }
}
