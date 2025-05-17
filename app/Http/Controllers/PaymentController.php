<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\BeadCredential;
use App\Services\BeadPaymentService;
use App\Events\PaymentNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;
use Inertia\Inertia;

class PaymentController extends Controller
{
    protected $notificationController;

    /**
     * Constructor to inject NotificationController
     */
    public function __construct(NotificationController $notificationController)
    {
        $this->notificationController = $notificationController;
    }

        /**
     * Display the credit card payment page for an invoice
     * 
     * This method finds an invoice by its payment token and renders the credit card payment page
     * if the invoice is not already paid or closed.
     * 
     * @param string $token The unique payment token for the invoice
     * @return \Inertia\Response Renders the credit card payment page with invoice data
     */
    public function showCreditCardPayment(string $token)
    {
        $invoice = Invoice::where('payment_token', $token)
            ->whereNotIn('status', ['paid', 'closed'])
            ->firstOrFail();
            
        return Inertia::render('Payment/CreditCard', [
            'invoice' => $invoice,
            'token' => $token,
            'nmi_invoice_id' => $invoice->nmi_invoice_id
        ]);
    }

    /**
     * Display the Bitcoin payment page for an invoice
     * 
     * This method finds an invoice by its payment token and renders the Bitcoin payment page
     * if the invoice is not already paid or closed.
     * 
     * @param string $token The unique payment token for the invoice
     * @return \Inertia\Response Renders the Bitcoin payment page with invoice data
     */
    public function showBitcoinPayment(string $token)
    {
        $invoice = Invoice::where('payment_token', $token)
            ->whereNotIn('status', ['paid', 'closed'])
            ->firstOrFail();
            
        return Inertia::render('Payment/Bitcoin', [
            'invoice' => $invoice,
            'token' => $token
        ]);
    }

    /**
     * Process a credit card payment using NMI payment gateway
     * 
     * @param Request $request Contains payment token, invoice ID, amount, and customer details
     * @return \Illuminate\Http\JsonResponse Payment status and transaction details
     */
    public function processCreditCardPayment(Request $request)
    {
        try {
            // Log the incoming request data
            Log::info('Processing credit card payment request', [
                'token' => $request->input('token'),
                'token_length' => strlen($request->input('token')),
                'token_format' => substr($request->input('token'), 0, 10) . '...',
                'invoice_id' => $request->input('invoiceId'),
                'amount' => $request->input('amount'),
                'all_request_data' => $request->all()
            ]);

            // Validate the request
            $validated = $request->validate([
                'token' => 'required|string',
                'invoiceId' => 'required|string',
                'amount' => 'required|numeric',
                'firstName' => 'required|string',
                'lastName' => 'required|string',
                'address' => 'required|string',
                'city' => 'required|string',
                'state' => 'required|string',
                'zip' => 'required|string',
                'phone' => 'required|string',
            ]);

            // Find the invoice by NMI invoice ID
            $invoice = Invoice::where('nmi_invoice_id', $validated['invoiceId'])->first();
            
            if (!$invoice) {
                Log::error('Invoice not found for NMI invoice ID', [
                    'nmi_invoice_id' => $validated['invoiceId']
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Invoice not found'
                ], 404);
            }

            Log::info('Found invoice for payment', [
                'invoice_id' => $invoice->id,
                'nmi_invoice_id' => $invoice->nmi_invoice_id,
                'status' => $invoice->status,
                'total' => $invoice->total,
                'payment_token' => $invoice->payment_token
            ]);
            
            // Get the user's profile for the API key
            $user = User::findOrFail($invoice->user_id);
            $userProfile = UserProfile::where('user_id', $user->id)->firstOrFail();
            
            if (empty($userProfile->private_key)) {
                Log::error('No API private key found for user', [
                    'user_id' => $user->id,
                    'invoice_id' => $invoice->id
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'No API private key found for this account.'
                ], 400);
            }

            // Prepare NMI API request for a sale transaction
            $saleData = [
                'security_key' => $userProfile->private_key,
                'type' => 'sale',
                'payment_token' => $validated['token'],
                'amount' => $validated['amount'],
                'orderid' => $validated['invoiceId'],
                'first_name' => $validated['firstName'],
                'last_name' => $validated['lastName'],
                'address1' => $validated['address'],
                'city' => $validated['city'],
                'state' => $validated['state'],
                'zip' => $validated['zip'],
                'phone' => $validated['phone'],
                'currency' => 'USD',
                'tax' => number_format($invoice->tax_amount, 2, '.', ''),
                'customer_id' => $invoice->client_email
            ];
            
            // Log the request data (redacting the security key)
            $logData = $saleData;
            $logData['security_key'] = '[REDACTED]';
            Log::info('Sending sale request to NMI', $logData);
            
            // Send the request to NMI
            $ch = curl_init('https://secure.nmi.com/api/transact.php');
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($saleData));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "accept: application/x-www-form-urlencoded",
                "content-type: application/x-www-form-urlencoded"
            ]);
            
            // SSL verification settings
            if (app()->environment('local')) {
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
            } else {
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 1);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
            }
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            
            curl_close($ch);
            
            // Log the response
            Log::info('NMI Payment API Response', [
                'http_code' => $httpCode,
                'response' => $response,
                'curl_error' => $curlError
            ]);
            
            // Check for cURL errors
            if ($curlError) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error connecting to payment gateway: ' . $curlError
                ], 500);
            }
            
            // Parse the response
            parse_str($response, $responseData);
            
            // Check if the payment was successful
            if (isset($responseData['response']) && $responseData['response'] == 1) {
                // Update the invoice as paid
                $invoice->update([
                    'status' => 'paid',
                    'payment_date' => now(),
                    'transaction_id' => $responseData['transactionid'] ?? null,
                    'payment_method' => 'credit card',
                ]);
                
                // Send payment notifications using NotificationController
                $this->notificationController->sendPaymentNotifications($invoice);
                
                // Dispatch payment notification event
                $notificationData = [
                    'invoice_id' => $invoice->id,
                    'nmi_invoice_id' => $invoice->nmi_invoice_id,
                    'client_email' => $invoice->client_email,
                    'amount' => $validated['amount'],
                    'transaction_id' => $responseData['transactionid'] ?? null,
                    'authorization_code' => $responseData['authcode'] ?? null,
                    'status' => 'success',
                    'payment_date' => now()->toDateTimeString(),
                ];
                event(new PaymentNotification($notificationData));
                
                return response()->json([
                    'success' => true,
                    'message' => 'Payment processed successfully',
                    'transaction_id' => $responseData['transactionid'] ?? null,
                    'authorization_code' => $responseData['authcode'] ?? null,
                ]);
            } else {
                Log::error('Payment processing failed', [
                    'response_data' => $responseData,
                    'invoice_id' => $invoice->id,
                    'nmi_invoice_id' => $invoice->nmi_invoice_id
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => $responseData['responsetext'] ?? 'Payment processing failed',
                    'code' => $responseData['response'] ?? null,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Payment processing error: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while processing your payment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new cryptocurrency payment for an invoice
     * 
     * @param Request $request Contains token, invoice ID, and payment amount
     * @return \Illuminate\Http\JsonResponse Payment status and URL for the payment gateway
     */
    public function createCryptoPayment(Request $request)
    {
        try {
            $validated = $request->validate([
                'token' => 'required|string',
                'invoiceId' => 'required|integer',
                'amount' => 'required|numeric|min:0.01',
            ]);

            // Find the invoice
            $invoice = Invoice::findOrFail($validated['invoiceId']);

            // Get the user's Bead credentials
            $beadCredentials = BeadCredential::where('user_id', $invoice->user_id)->first();
            
            if (!$beadCredentials) {
                return response()->json([
                    'success' => false,
                    'message' => 'No Bead credentials found for this user.'
                ], 400);
            }

            // Check if the invoice already has a bead_payment_id
            if ($invoice->bead_payment_id) {
                $beadService = new BeadPaymentService($beadCredentials);
                try {
                    $paymentData = $beadService->checkPaymentStatus($invoice->bead_payment_id);
                    Log::info('Retrieved existing Bead payment status', [
                        'invoice_id' => $invoice->id,
                        'bead_payment_id' => $invoice->bead_payment_id,
                        'status' => $paymentData
                    ]);

                    return response()->json([
                        'success' => true,
                        'has_existing_payment' => true,
                        'message' => 'Retrieved existing payment status',
                        'payment_url' => $invoice->bead_payment_url,
                        'payment_data' => $paymentData,
                    ]);
                } catch (Exception $e) {
                    Log::error('Failed to check existing payment status', [
                        'error' => $e->getMessage(),
                        'bead_payment_id' => $invoice->bead_payment_id
                    ]);
                }
            }

            // Check if the invoice is already paid
            if ($invoice->status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'This invoice has already been paid.'
                ], 400);
            }

            $beadService = new BeadPaymentService($beadCredentials);
            
            try {
                Log::info('Creating crypto payment for invoice', [
                    'nmi_invoice_id' => $invoice->nmi_invoice_id,
                    'amount' => $validated['amount']
                ]);

                $reference = $invoice->nmi_invoice_id;
                
                $paymentResponse = $beadService->createCryptoPayment(
                    $validated['amount'],
                    'USD',
                    $reference,
                    'Invoice payment for ' . $reference
                );

                Log::info('Received payment response from Bead', [
                    'payment_id' => $paymentResponse['trackingId'] ?? null,
                    'payment_url' => $paymentResponse['paymentUrls'][0]['url'] ?? null,
                    'reference_used' => $reference
                ]);

                // Store the Bead payment ID in the invoice
                $invoice->update([
                    'bead_payment_id' => $paymentResponse['trackingId'] ?? null,
                    'payment_method' => 'crypto',
                    'status' => 'pending',
                    'bead_payment_url' => $paymentResponse['paymentUrls'][0]['url'] ?? null
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Crypto payment initiated',
                    'payment_data' => [
                        'trackingId' => $paymentResponse['trackingId'] ?? null,
                        'paymentUrl' => $paymentResponse['paymentUrls'][0]['url'] ?? null
                    ]
                ]);

            } catch (Exception $e) {
                $errorMessage = $e->getMessage();
                $statusCode = 500;
                
                if (strpos($errorMessage, '403') !== false) {
                    $errorMessage = "The Bead payment system returned a 403 Forbidden error. This typically means the terminal doesn't have permission to process crypto payments. Please contact support and provide these details: Terminal ID: {$beadService->getTerminalId()}, Invoice Id: {$invoice->nmi_invoice_id}";
                    $statusCode = 403;
                }
                
                Log::error('Failed to create crypto payment', [
                    'error' => $errorMessage,
                    'trace' => $e->getTraceAsString()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => $errorMessage
                ], $statusCode);
            }
        } catch (\Exception $e) {
            Log::error('Payment processing error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while processing your payment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify the status of a Bead payment
     * 
     * @param Request $request Contains tracking ID and optional status
     * @return \Illuminate\Http\JsonResponse Payment status and invoice details
     */
    public function verifyBeadPayment(Request $request)
    {
        try {
            $validated = $request->validate([
                'trackingId' => 'required|string',
                'status' => 'nullable|string'
            ]);

            $trackingId = $validated['trackingId'];
            
            // Find the invoice by tracking ID
            $invoice = Invoice::where('bead_payment_id', $trackingId)->first();
            
            if (!$invoice) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invoice not found for this payment'
                ], 404);
            }

            // Get the user's Bead credentials
            $beadCredentials = BeadCredential::where('user_id', $invoice->user_id)->first();
            
            if (!$beadCredentials) {
                return response()->json([
                    'success' => false,
                    'message' => 'No Bead credentials found for this user'
                ], 400);
            }
            
            // Check payment status from Bead API
            $beadService = new BeadPaymentService($beadCredentials);
            $paymentStatus = $beadService->checkPaymentStatus($trackingId);

            Log::info('Payment status', [
                'paymentStatus' => $paymentStatus,
                'invoice_id' => $invoice->id,
                'user_id' => $invoice->user_id
            ]);
            
            // Update invoice status if payment is completed
            if (isset($paymentStatus['status_code']) && $paymentStatus['status_code'] === 'completed' && $invoice->status !== 'paid') {
                $invoice->status = 'paid';
                $invoice->payment_date = now();
                $invoice->save();
                
                // Send payment notifications using NotificationController
                $this->notificationController->sendPaymentNotifications($invoice);

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
                
                return response()->json([
                    'success' => true,
                    'message' => 'Payment verified successfully',
                    'payment' => $paymentStatus,
                    'invoice' => [
                        'id' => $invoice->nmi_invoice_id,
                        'amount' => $invoice->total
                    ]
                ]);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Payment verified successfully',
                'payment' => $paymentStatus,
                'invoice' => [
                    'id' => $invoice->nmi_invoice_id,
                    'amount' => $invoice->total
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Payment verification error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error verifying payment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle Bead payment webhook
     * 
     * @param Request $request Contains tracking ID and payment status information
     * @return \Illuminate\Http\JsonResponse Payment verification status
     */
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

            // Find the invoice by Bead payment ID
            $invoice = Invoice::where('bead_payment_id', $trackingId)->first();
            if (!$invoice) {
                throw new Exception('Invoice not found for tracking ID: ' . $trackingId);
            }

            Log::info('Invoice found for tracking ID: ' . $trackingId, [
                'invoice' => $invoice
            ]);

            // Get the user's Bead credentials
            $beadCredentials = BeadCredential::where('user_id', $invoice->user_id)->first();
            if (!$beadCredentials) {
                throw new Exception('No Bead credentials found for user: ' . $invoice->user_id);
            }

            $beadService = new BeadPaymentService($beadCredentials);
            $paymentData = $beadService->checkPaymentStatus($trackingId);

            // Update invoice status based on payment data
            if (isset($paymentData['status_code']) && $paymentData['status_code'] === 'completed') {
                $invoice->status = 'paid';
                $invoice->payment_date = now();
                $invoice->transaction_id = $paymentData['transaction_id'];
                $invoice->save();
                
                // Send payment notifications using NotificationController
                $this->notificationController->sendPaymentNotifications($invoice);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Payment verified successfully',
                    'payment' => $paymentData,
                    'invoice' => [
                        'id' => $invoice->nmi_invoice_id,
                        'amount' => $invoice->total
                    ]
                ]);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Payment verified successfully',
                'payment' => $paymentData,
                'invoice' => [
                    'id' => $invoice->nmi_invoice_id,
                    'amount' => $invoice->total
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to process Bead webhook: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to process Bead webhook: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test Bead API Authentication
     * 
     * @return \Illuminate\Http\JsonResponse Authentication status and token information
     */
    public function testBeadAuth()
    {
        try {
            $beadService = new BeadPaymentService();
            $response = $beadService->authenticate();

            return response()->json([
                'success' => true,
                'message' => 'Successfully authenticated with Bead API',
                'token_info' => [
                    'access_token' => substr($response, 0, 50) . '...',
                    'token_length' => strlen($response)
                ]
            ]);
        } catch (Exception $e) {
            Log::error('Bead API Authentication error', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to authenticate with Bead API: ' . $e->getMessage()
            ], 500);
        }
    }


} 