<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;
use App\Models\Invoice;
use Illuminate\Http\Request;

class BeadPaymentService
{
    private $accessToken;
    private $apiUrl;
    private $authUrl;
    private $terminalId;
    private $username;
    private $password;

    public function __construct()
    {
        $this->apiUrl = config('services.bead.api_url', env('BEAD_API_URL'));
        $this->authUrl = config('services.bead.auth_url', env('BEAD_AUTH_URL'));
        $this->terminalId = config('services.bead.terminal_id', env('BEAD_TERMINAL_ID'));
        $this->username = env('BEAD_USERNAME');
        
        // Fix password handling - the escaped backslash in .env might cause issues
        $this->password = env('BEAD_PASSWORD');

        if (empty($this->authUrl) || empty($this->terminalId) || empty($this->password)) {
            throw new Exception('Bead API configuration is incomplete. Please check your .env file.');
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
            
            // Use the React frontend URL for redirect
            $frontendUrl = 'http://localhost:3000';
            
            // Simplify payload to match exactly what's in the documentation
            $payload = [
                'merchantId' => env('BEAD_MERCHANT_ID'),
                'terminalId' => $this->terminalId,
                'requestedAmount' => $requestedAmount,
                'paymentUrlType' => 'web',
                'reference' => $orderId,
                'redirectUrl' => $frontendUrl . '/payment-success'
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
     * Check payment status
     */
    public function checkPaymentStatus($paymentId)
    {
        if (!$this->accessToken) {
            $this->authenticate();
        }

        try {
            $response = Http::withToken($this->accessToken)
                ->get($this->apiUrl . '/payments/' . $paymentId);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('Failed to check Bead payment status', [
                'status' => $response->status(),
                'response' => $response->json()
            ]);

            throw new Exception('Failed to check payment status: ' . $response->body());
        } catch (Exception $e) {
            Log::error('Bead API Status Check error', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    public function handleBeadWebhook(Request $request)
    {
        try {
            Log::info('Received Bead webhook', [
                'payload' => $request->all()
            ]);

            $trackingId = $request->input('trackingId');
            if (!$trackingId) {
                throw new Exception('Tracking ID not found in webhook');
            }

            // Find the invoice by Bead payment ID (which is the trackingId)
            $invoice = Invoice::where('bead_payment_id', $trackingId)->first();
            if (!$invoice) {
                throw new Exception('Invoice not found for tracking ID: ' . $trackingId);
            }

            // Update invoice status based on statusCode
            $statusCode = $request->input('statusCode');
            switch ($statusCode) {
                case 2: // Payment Completed
                    $invoice->status = 'paid';
                    $invoice->payment_date = now();
                    $invoice->transaction_id = $request->input('paymentCode');
                    break;
                case 3: // Payment Underpaid
                    $invoice->status = 'underpaid';
                    break;
                case 4: // Payment Overpaid
                    $invoice->status = 'paid';
                    $invoice->payment_date = now();
                    $invoice->transaction_id = $request->input('paymentCode');
                    // You might want to note the overpayment
                    $invoice->notes = 'Payment was overpaid. Customer should reclaim excess funds.';
                    break;
                case 7: // Payment Expired
                    $invoice->status = 'expired';
                    break;
                case 8: // Payment Invalid
                    $invoice->status = 'invalid';
                    break;
                case 9: // Payment Cancelled
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
