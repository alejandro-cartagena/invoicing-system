<?php

namespace App\Http\Controllers;

use App\Mail\SendInvoiceMail;
use App\Models\Invoice;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Services\BeadPaymentService;
use App\Mail\PaymentReceiptMail;
use App\Events\PaymentNotification;
use Exception;

class InvoiceController extends Controller
{
    public function sendEmail(Request $request)
    {
        try {
            $validated = $request->validate([
                'invoiceData' => 'required|array',
                'pdfBase64' => 'required|string',
                'recipientEmail' => 'required|email',
                'invoiceType' => 'required|in:general,real_estate',
                // Validate real estate fields if invoice type is real_estate
                'propertyAddress' => 'required_if:invoiceType,real_estate',
                'titleNumber' => 'required_if:invoiceType,real_estate',
                'buyerName' => 'required_if:invoiceType,real_estate',
                'sellerName' => 'required_if:invoiceType,real_estate',
                'agentName' => 'required_if:invoiceType,real_estate',
            ]);

            // Check PDF size before processing
            $pdfContent = $validated['pdfBase64'];
            if (strpos($pdfContent, 'data:application/pdf;base64,') === 0) {
                $pdfContent = substr($pdfContent, 28);
            }
            
            // Calculate approximate size of the PDF
            $pdfSize = strlen($pdfContent) * 3 / 4; // Base64 to binary size approximation
            $maxSize = 8 * 1024 * 1024; // 8MB limit
            
            if ($pdfSize > $maxSize) {
                return response()->json([
                    'success' => false,
                    'message' => 'PDF file is too large. Maximum size is 8MB. Current size is approximately ' . 
                        round($pdfSize / (1024 * 1024), 2) . 'MB. Try removing large images from your invoice.'
                ], 413); // 413 Payload Too Large
            }
            
            // Get the authenticated user
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Decode the base64 content
            $decodedPdf = base64_decode($pdfContent);
            
            // Verify it's a valid PDF (check for PDF signature)
            if (substr($decodedPdf, 0, 4) !== '%PDF') {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid PDF content'
                ], 400);
            }

            // Extract invoice data
            $invoiceData = $validated['invoiceData'];
            
            // If this is a real estate invoice, ensure the real estate fields are included in invoiceData
            if ($validated['invoiceType'] === 'real_estate') {
                $invoiceData = array_merge($invoiceData, [
                    'propertyAddress' => $validated['propertyAddress'],
                    'titleNumber' => $validated['titleNumber'],
                    'buyerName' => $validated['buyerName'],
                    'sellerName' => $validated['sellerName'],
                    'agentName' => $validated['agentName']
                ]);
            }
            
            // Calculate values to store in database
            $subTotal = 0;
            if (isset($invoiceData['productLines']) && is_array($invoiceData['productLines'])) {
                foreach ($invoiceData['productLines'] as $line) {
                    $quantity = floatval($line['quantity'] ?? 0);
                    $rate = floatval($line['rate'] ?? 0);
                    $subTotal += $quantity * $rate;
                }
            }
            
            // Extract tax rate from tax rate field or tax label
            $taxRate = 0;
            $taxAmount = 0;
            
            // First try to get tax rate directly from taxRate field
            if (isset($invoiceData['taxRate']) && is_numeric($invoiceData['taxRate'])) {
                $taxRate = floatval($invoiceData['taxRate']);
            }
            // If taxRate is not available, try to extract from taxLabel
            else if (isset($invoiceData['taxLabel'])) {
                preg_match('/(\d+)%/', $invoiceData['taxLabel'], $matches);
                if (isset($matches[1])) {
                    $taxRate = floatval($matches[1]);
                }
            }
            
            // Calculate tax amount if we have a valid tax rate
            if ($taxRate > 0) {
                $taxAmount = $subTotal * ($taxRate / 100);
            }
            
            $total = $subTotal + $taxAmount;
            
            // Add calculated values to invoice data for PDF generation
            $invoiceData['_calculatedSubTotal'] = $subTotal;
            $invoiceData['_calculatedTax'] = $taxAmount;
            $invoiceData['_calculatedTotal'] = $total;
            $invoiceData['taxRate'] = $taxRate; // Add the actual tax rate
            
            // Parse dates
            $invoiceDate = isset($invoiceData['invoiceDate']) && !empty($invoiceData['invoiceDate']) 
                ? date('Y-m-d', strtotime($invoiceData['invoiceDate'])) 
                : date('Y-m-d');
                
            $dueDate = isset($invoiceData['invoiceDueDate']) && !empty($invoiceData['invoiceDueDate']) 
                ? date('Y-m-d', strtotime($invoiceData['invoiceDueDate'])) 
                : date('Y-m-d', strtotime('+30 days'));

            // Generate a unique payment token
            $paymentToken = Str::random(64);
            
            // Create invoice data array
            $invoiceCreateData = [
                'user_id' => $user->id,
                'invoice_type' => $validated['invoiceType'],
                'company_name' => $invoiceData['companyName'] ?? 'Client',
                'client_email' => $validated['recipientEmail'],
                'subtotal' => $subTotal,
                'tax_rate' => $taxRate,
                'tax_amount' => $taxAmount,
                'total' => $total,
                'invoice_date' => $invoiceDate,
                'due_date' => $dueDate,
                'status' => 'sent',
                'invoice_data' => $invoiceData,
                'payment_token' => $paymentToken,
            ];
            
            // Save invoice to database
            $invoice = Invoice::create($invoiceCreateData);

            // Send the email with the PDF attachment
            Mail::to($validated['recipientEmail'])
                ->send(new SendInvoiceMail(
                    $invoiceData,
                    $user,
                    $decodedPdf,
                    $invoice->payment_token,
                    false,
                    $validated['invoiceType']
                ));

            return response()->json([
                'success' => true,
                'message' => 'Invoice sent successfully',
                'invoice_id' => $invoice->id
            ]);
        } catch (\Exception $e) {
            // Check for specific database packet size errors
            if (strpos($e->getMessage(), 'max_allowed_packet') !== false || 
                strpos($e->getMessage(), 'SQLSTATE[08S01]') !== false) {
                
                Log::error('Database packet size exceeded: ' . $e->getMessage(), [
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'The invoice contains images that are too large. Please reduce image sizes and try again. Maximum allowed size is 1MB per image.',
                    'error_type' => 'file_size_exceeded'
                ], 413);
            }
            
            Log::error('Failed to send invoice: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to send invoice: ' . $e->getMessage(),
                'debug_info' => [
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ]
            ], 500);
        }
    }
    
    /**
     * Display a listing of the invoices.
     *
     * @return \Inertia\Response
     */
    public function index()
    {
        // Get current date for overdue check
        $today = now()->startOfDay();
        
        // Get all invoices for the authenticated user
        $invoices = Invoice::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get();
        
        // Update status to 'overdue' for invoices past due date that aren't paid or closed
        foreach ($invoices as $invoice) {
            $dueDate = \Carbon\Carbon::parse($invoice->due_date)->startOfDay();
            
            // Check if invoice is past due and not already paid or closed
            if ($today->gt($dueDate) && 
                $invoice->status !== 'paid' && 
                $invoice->status !== 'closed' &&
                $invoice->status !== 'overdue') {
                
                // Update status to overdue
                $invoice->status = 'overdue';
                $invoice->save();
                
                \Log::info('Invoice marked as overdue', [
                    'invoice_id' => $invoice->id,
                    'due_date' => $invoice->due_date,
                    'today' => $today->toDateString()
                ]);
            }
        }
        
        // Refresh the collection after potential status updates
        $invoices = Invoice::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($invoice) {
                // Convert UTC dates to your local timezone and format them
                $invoice->invoice_date = \Carbon\Carbon::parse($invoice->invoice_date)
                    ->setTimezone(config('app.timezone'))
                    ->format('Y-m-d');
                
                $invoice->due_date = \Carbon\Carbon::parse($invoice->due_date)
                    ->setTimezone(config('app.timezone'))
                    ->format('Y-m-d');
                    
                return $invoice;
            });
            
        return Inertia::render('User/Invoices', [
            'invoices' => $invoices
        ]);
    }

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
     * Process credit card payment using NMI token
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function processCreditCardPayment(Request $request)
    {
        try {
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

            // Get the invoice by NMI invoice ID instead of primary key
            $invoice = Invoice::where('nmi_invoice_id', $validated['invoiceId'])->firstOrFail();
            
            // Get the user's profile for the API key
            $user = User::findOrFail($invoice->user_id);
            $userProfile = UserProfile::where('user_id', $user->id)->firstOrFail();
            
            if (empty($userProfile->private_key)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No API private key found for this account.'
                ], 400);
            }

            // Prepare NMI API request for a sale transaction
            $saleData = [
                'security_key' => $userProfile->private_key,
                'type' => 'sale',
                'payment_token' => $validated['token'], // The token from Collect.js
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
            \Log::info('Processing credit card payment via NMI', $logData);
            
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
            \Log::info('NMI Payment API Response', [
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
            
            // Check if the payment was successful (response code 1 = approved)
            if (isset($responseData['response']) && $responseData['response'] == 1) {
                // Update the invoice as paid
                $invoice->update([
                    'status' => 'paid',
                    'payment_date' => now(),
                    'transaction_id' => $responseData['transactionid'] ?? null,
                ]);
                
                // Send receipt email to customer
                Mail::to($invoice->client_email)->send(new PaymentReceiptMail($invoice));
                Mail::to($invoice->user->email)->send(new PaymentReceiptMail($invoice));
                
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
                event(new \App\Events\PaymentNotification($notificationData));
                
                return response()->json([
                    'success' => true,
                    'message' => 'Payment processed successfully',
                    'transaction_id' => $responseData['transactionid'] ?? null,
                    'authorization_code' => $responseData['authcode'] ?? null,
                ]);
            } else {
                // Payment failed
                return response()->json([
                    'success' => false,
                    'message' => $responseData['responsetext'] ?? 'Payment processing failed',
                    'code' => $responseData['response'] ?? null,
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Payment processing error: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while processing your payment: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getBeadPaymentStatus(Request $request) {
        try {
            // Validate the request
            $validated = $request->validate([
                'trackingId' => 'required|string'
            ]);

            // Find the invoice using the tracking ID (bead_payment_id)
            $invoice = Invoice::where('bead_payment_id', $validated['trackingId'])->first();
            
            if (!$invoice) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invoice not found for this tracking ID'
                ], 404);
            }

            // Initialize BeadPaymentService and get status
            $beadService = new BeadPaymentService();
            $statusResponse = $beadService->checkPaymentStatus($validated['trackingId']);

            // Update invoice status if payment is completed (status code 2)
            if (isset($statusResponse['data']['status_code']) && $statusResponse['data']['status_code'] === 2) {
                $invoice->status = 'paid';
                $invoice->payment_date = now();
                $invoice->save();
            }

            // Return the status information with invoice details
            return response()->json([
                'success' => true,
                'data' => array_merge($statusResponse['data'], [
                    'invoice_id' => $invoice->id,
                    'tracking_id' => $validated['trackingId']
                ])
            ]);

        } catch (\Exception $e) {
            \Log::error('Failed to get Bead payment status: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to get payment status: ' . $e->getMessage()
            ], 500);
        }
    }

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

            // Check if the invoice already has a bead_payment_id
            if ($invoice->bead_payment_id) {
                $beadService = new BeadPaymentService();
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
                    // Continue with new payment if status check fails
                }
            }

            // Check if the invoice is already paid
            if ($invoice->status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'This invoice has already been paid.'
                ], 400);
            }

            $beadService = new BeadPaymentService();
            
            try {
                Log::info('Creating crypto payment for invoice', [
                    'nmi_invoice_id' => $invoice->nmi_invoice_id,
                    'amount' => $validated['amount']
                ]);

                // Use nmi_invoice_id as the reference
                $reference = $invoice->nmi_invoice_id;
                
                $paymentResponse = $beadService->createCryptoPayment(
                    $validated['amount'],
                    'USD',
                    $reference, // Using nmi_invoice_id as reference
                    'Invoice payment for ' . $reference
                );

                // Log the successful response
                Log::info('Received payment response from Bead', [
                    'payment_id' => $paymentResponse['trackingId'] ?? null,
                    'payment_url' => $paymentResponse['paymentUrls'][0]['url'] ?? null,
                    'reference_used' => $reference
                ]);

                // Store the Bead payment ID in the invoice
                $invoice->update([
                    'bead_payment_id' => $paymentResponse['trackingId'] ?? null,
                    'payment_method' => 'crypto',
                    'status' => 'pending', // Update status to pending
                    'bead_payment_url' => $paymentResponse['paymentUrls'][0]['url'] ?? null
                ]);

                // Format the response for the frontend
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
                
                // Check if the error message contains a 403 (Forbidden) reference
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

    public function destroy(Invoice $invoice)
    {
        // Check if the invoice belongs to the authenticated user
        if ($invoice->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }
        
        // Delete the invoice
        $invoice->delete();
        
        return redirect()->route('user.invoices')->with('success', 'Invoice deleted successfully');
    }

    public function resend(Invoice $invoice)
    {
        // Check if the invoice belongs to the authenticated user
        if ($invoice->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }
        
        // Add this check to prevent resending paid or closed invoices
        if ($invoice->status === 'paid' || $invoice->status === 'closed') {
            return redirect()->route('user.invoices')
                ->with('error', 'Paid or closed invoices cannot be resent.');
        }
        
        // Get the user
        $user = Auth::user();
        
        // Get the invoice data
        $invoiceData = $invoice->invoice_data;
        
        // If this is a real estate invoice, ensure the fields are included
        if ($invoice->invoice_type === 'real_estate') {
            $invoiceData = array_merge($invoiceData, [
                'propertyAddress' => $invoice->property_address,
                'titleNumber' => $invoice->title_number,
                'buyerName' => $invoice->buyer_name,
                'sellerName' => $invoice->seller_name,
                'agentName' => $invoice->agent_name
            ]);
        }
        
        // Generate the PDF
        $pdf = PDF::loadView('pdfs.invoice', ['data' => $invoiceData]);
        $pdfContent = $pdf->output();
        
        // Send the email with the PDF attachment
        Mail::to($invoice->client_email)
            ->send(new SendInvoiceMail(
                $invoiceData, // Now includes real estate fields
                $user,
                $pdfContent,
                $invoice->payment_token,
                false,
                $invoice->invoice_type
            ));
        
        return redirect()->route('user.invoices')->with('success', 'Invoice resent successfully');
    }

    public function download(Invoice $invoice)
    {
        // Check if the invoice belongs to the authenticated user
        if ($invoice->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }

        // Parse the invoice_data JSON if it's stored as a string
        $invoiceData = is_string($invoice->invoice_data) 
            ? json_decode($invoice->invoice_data, true) 
            : $invoice->invoice_data;

        return response()->json([
            'success' => true,
            'invoice' => $invoice,
            'invoiceData' => $invoiceData
        ]);
    }

    /**
     * Resend an invoice after editing by deleting the old one and creating a new one.
     */
    public function resendAfterEdit(Request $request, Invoice $invoice)
    {
        try {
            // Check if the invoice is paid or closed
            if ($invoice->status === 'paid' || $invoice->status === 'closed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Paid or closed invoices cannot be edited or resent.'
                ], 403);
            }
            
            $validated = $request->validate([
                'invoiceData' => 'required|array',
                'pdfBase64' => 'required|string',
                'recipientEmail' => 'required|email',
                // Add validation for real estate fields if it's a real estate invoice
                'propertyAddress' => 'required_if:invoiceType,real_estate',
                'titleNumber' => 'required_if:invoiceType,real_estate',
                'buyerName' => 'required_if:invoiceType,real_estate',
                'sellerName' => 'required_if:invoiceType,real_estate',
                'agentName' => 'required_if:invoiceType,real_estate',
            ]);

            // Get the authenticated user
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Clean the PDF content (remove data:application/pdf;base64, prefix)
            $pdfContent = $validated['pdfBase64'];
            if (strpos($pdfContent, 'data:application/pdf;base64,') === 0) {
                $pdfContent = substr($pdfContent, 28);
            }
            
            // Decode the base64 content
            $decodedPdf = base64_decode($pdfContent);
            
            // Verify it's a valid PDF (check for PDF signature)
            if (substr($decodedPdf, 0, 4) !== '%PDF') {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid PDF content'
                ], 400);
            }

            // Extract invoice data
            $invoiceData = $validated['invoiceData'];
            
            // If this is a real estate invoice, ensure the real estate fields are included in invoiceData
            if ($invoice->invoice_type === 'real_estate') {
                $invoiceData = array_merge($invoiceData, [
                    'propertyAddress' => $validated['propertyAddress'],
                    'titleNumber' => $validated['titleNumber'],
                    'buyerName' => $validated['buyerName'],
                    'sellerName' => $validated['sellerName'],
                    'agentName' => $validated['agentName']
                ]);
            }
            
            // Calculate values to store in database
            $subTotal = 0;
            if (isset($invoiceData['productLines']) && is_array($invoiceData['productLines'])) {
                foreach ($invoiceData['productLines'] as $line) {
                    $quantity = floatval($line['quantity'] ?? 0);
                    $rate = floatval($line['rate'] ?? 0);
                    $subTotal += $quantity * $rate;
                }
            }
            
            // Extract tax rate from tax rate field or tax label
            $taxRate = 0;
            $taxAmount = 0;
            
            // First try to get tax rate directly from taxRate field
            if (isset($invoiceData['taxRate']) && is_numeric($invoiceData['taxRate'])) {
                $taxRate = floatval($invoiceData['taxRate']);
            }
            // If taxRate is not available, try to extract from taxLabel
            else if (isset($invoiceData['taxLabel'])) {
                preg_match('/(\d+)%/', $invoiceData['taxLabel'], $matches);
                if (isset($matches[1])) {
                    $taxRate = floatval($matches[1]);
                }
            }
            
            // Calculate tax amount if we have a valid tax rate
            if ($taxRate > 0) {
                $taxAmount = $subTotal * ($taxRate / 100);
            }
            
            $total = $subTotal + $taxAmount;
            
            // Parse dates
            $invoiceDate = isset($invoiceData['invoiceDate']) && !empty($invoiceData['invoiceDate']) 
                ? date('Y-m-d', strtotime($invoiceData['invoiceDate'])) 
                : date('Y-m-d');
                
            $dueDate = isset($invoiceData['invoiceDueDate']) && !empty($invoiceData['invoiceDueDate']) 
                ? date('Y-m-d', strtotime($invoiceData['invoiceDueDate'])) 
                : date('Y-m-d', strtotime('+30 days'));

            // Generate a unique payment token
            $paymentToken = Str::random(64);
            
            // Create a new invoice
            $newInvoice = Invoice::create([
                'user_id' => $user->id,
                'invoice_type' => $invoice->invoice_type,
                'company_name' => $invoiceData['companyName'] ?? 'Client',
                'client_email' => $validated['recipientEmail'],
                'subtotal' => $subTotal,
                'tax_rate' => $taxRate,
                'tax_amount' => $taxAmount,
                'total' => $total,
                'invoice_date' => $invoiceDate,
                'due_date' => $dueDate,
                'status' => 'sent',
                'invoice_data' => $invoiceData,
                'payment_token' => $paymentToken,
            ]);

            // Send the email with the PDF attachment
            Mail::to($validated['recipientEmail'])
                ->send(new SendInvoiceMail(
                    $invoiceData, // Now includes real estate fields
                    $user,
                    $decodedPdf,
                    $newInvoice->payment_token,
                    true,
                    $invoice->invoice_type
                ));
            
            // Delete the old invoice after successfully creating the new one
            $invoice->delete();

            return response()->json([
                'success' => true,
                'message' => 'Invoice updated, sent to customer, and old invoice deleted successfully',
                'invoice_id' => $newInvoice->id
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to resend invoice after edit: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to resend invoice: ' . $e->getMessage(),
                'debug_info' => [
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ]
            ], 500);
        }
    }

    /**
     * Show the form for editing the specified invoice.
     */
    public function edit(Invoice $invoice)
    {
        // Check if the invoice belongs to the authenticated user
        if ($invoice->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }

        // Add this check to prevent editing paid or closed invoices
        if ($invoice->status === 'paid' || $invoice->status === 'closed') {
            return redirect()->route('user.invoice.view', $invoice->id)
                ->with('error', 'Paid or closed invoices cannot be edited.');
        }

        if ($invoice->invoice_type === 'real_estate') {
            return Inertia::render('User/RealEstateInvoice', [
                'invoiceData' => $invoice->invoice_data,
                'recipientEmail' => $invoice->client_email,
                'invoiceId' => $invoice->id,
                'isEditing' => true,
            ]);
        }
        else {
            // Return the GeneralInvoice page with the invoice data
            return Inertia::render('User/GeneralInvoice', [
                'invoiceData' => $invoice->invoice_data,
                'recipientEmail' => $invoice->client_email,
                'invoiceId' => $invoice->id,
                'isEditing' => true,
            ]);
        }
    }

    /**
     * Send invoice to NMI merchant portal
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function sendInvoiceToNmi(Request $request)
    {
        try {
            $validated = $request->validate([
                'invoiceData' => 'required|array',
                'recipientEmail' => 'required|email',
                'pdfBase64' => 'required|string',
                'invoiceType' => 'required|in:general,real_estate',
            ]);

            // Get the authenticated user
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }
            
            // Get the user's profile
            $userProfile = UserProfile::where('user_id', $user->id)->first();
            if (!$userProfile) {
                return response()->json([
                    'success' => false,
                    'message' => 'User profile not found'
                ], 404);
            }

            // Check if the user has a private key
            if (empty($userProfile->private_key)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No API private key found for your account. Please contact your administrator.'
                ], 400);
            }

            // Process the PDF data
            $pdfContent = $validated['pdfBase64'];
            if (strpos($pdfContent, 'data:application/pdf;base64,') === 0) {
                $pdfContent = substr($pdfContent, 28);
            }
            
            // Decode the base64 content
            $decodedPdf = base64_decode($pdfContent);
            
            // Verify it's a valid PDF (check for PDF signature)
            if (substr($decodedPdf, 0, 4) !== '%PDF') {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid PDF content'
                ], 400);
            }

            // Extract invoice data
            $invoiceData = $validated['invoiceData'];
            
            // Calculate values to store in database
            $subTotal = 0;
            $nmiData = [];
            if (isset($invoiceData['productLines']) && is_array($invoiceData['productLines'])) {
                foreach ($invoiceData['productLines'] as $index => $line) {
                    $quantity = floatval($line['quantity'] ?? 0);
                    $rate = floatval($line['rate'] ?? 0);
                    $lineTotal = $quantity * $rate;
                    $subTotal += $lineTotal;
                    
                    $itemIndex = $index + 1;
                    
                    // Format 1: item_x notation (most reliable based on NMI docs)
                    $nmiData['item_product_code_' . $itemIndex] = 'ITEM' . $itemIndex;
                    $nmiData['item_description_' . $itemIndex] = $line['description'] ?? '';
                    $nmiData['item_unit_cost_' . $itemIndex] = number_format($rate, 2, '.', '');
                    $nmiData['item_quantity_' . $itemIndex] = (int)$quantity;
                    $nmiData['item_total_amount_' . $itemIndex] = number_format($lineTotal, 2, '.', '');
                    
                    // Format 2: Alternative format
                    $nmiData['itemdescription' . $itemIndex] = $line['description'] ?? '';
                    $nmiData['itemunitcost' . $itemIndex] = number_format($rate, 2, '.', '');
                    $nmiData['itemquantity' . $itemIndex] = (int)$quantity;
                    $nmiData['itemtotalamount' . $itemIndex] = number_format($lineTotal, 2, '.', '');
                }
                
                // Log the line item details for debugging
                \Log::info('Line item details for NMI:', [
                    'total_items' => count($invoiceData['productLines']),
                    'subTotal' => $subTotal,
                    'line_items' => array_filter($nmiData, function($key) {
                        return strpos($key, 'item_') === 0 || strpos($key, 'itemdescription') === 0;
                    }, ARRAY_FILTER_USE_KEY)
                ]);
            }
            
            // Extract tax rate from tax rate field or tax label
            $taxRate = 0;
            $taxAmount = 0;
            
            // First try to get tax rate directly from taxRate field
            if (isset($invoiceData['taxRate']) && is_numeric($invoiceData['taxRate'])) {
                $taxRate = floatval($invoiceData['taxRate']);
            }
            // If taxRate is not available, try to extract from taxLabel
            else if (isset($invoiceData['taxLabel'])) {
                preg_match('/(\d+)%/', $invoiceData['taxLabel'], $matches);
                if (isset($matches[1])) {
                    $taxRate = floatval($matches[1]);
                }
            }
            
            // Calculate tax amount if we have a valid tax rate
            if ($taxRate > 0) {
                $taxAmount = $subTotal * ($taxRate / 100);
            }
            
            $total = $subTotal + $taxAmount;
            
            // Parse dates
            $invoiceDate = isset($invoiceData['invoiceDate']) && !empty($invoiceData['invoiceDate']) 
                ? date('Y-m-d', strtotime($invoiceData['invoiceDate'])) 
                : date('Y-m-d');
                
            $dueDate = isset($invoiceData['invoiceDueDate']) && !empty($invoiceData['invoiceDueDate']) 
                ? date('Y-m-d', strtotime($invoiceData['invoiceDueDate'])) 
                : date('Y-m-d', strtotime('+30 days'));
            
            // Generate a unique payment token
            $paymentToken = Str::random(64);
            
            // Extract client name parts for first_name and last_name
            $firstName = $invoiceData['firstName'] ?? '';
            $lastName = $invoiceData['lastName'] ?? '';
            $companyName = $invoiceData['companyName'] ?? '';

            // Log the raw values to help with debugging
            \Log::info('Raw name values from invoice data:', [
                'companyName' => $companyName,
                'firstName' => $firstName,
                'lastName' => $lastName
            ]);

            // Extract address components
            $country = $invoiceData['country'] ?? $invoiceData['clientCountry'] ?? '';
            $city = $invoiceData['city'] ?? '';
            $state = $invoiceData['state'] ?? '';
            $zip = $invoiceData['zip'] ?? '';

            // Try to extract city, state, zip from clientAddress2 if they're empty
            if (empty($city) || empty($state) || empty($zip)) {
                $cityStateZip = $invoiceData['clientAddress2'] ?? '';
                if (!empty($cityStateZip)) {
                    // Try to parse "City, State ZIP" format
                    $parts = explode(',', $cityStateZip);
                    
                    // If we have at least city
                    if (!empty($parts[0]) && empty($city)) {
                        $city = trim($parts[0]);
                    }
                    
                    // If we have state/zip part
                    if (!empty($parts[1])) {
                        $stateZipPart = trim($parts[1]);
                        
                        // Try to separate state and zip
                        preg_match('/([A-Z]{2})\s+(\d+)/', $stateZipPart, $matches);
                        
                        if (!empty($matches[1]) && empty($state)) {
                            $state = $matches[1];
                        }
                        
                        if (!empty($matches[2]) && empty($zip)) {
                            $zip = $matches[2];
                        } else {
                            // Just take numbers as zip if we couldn't match the pattern
                            $zipMatch = preg_replace('/[^0-9]/', '', $stateZipPart);
                            if (!empty($zipMatch) && empty($zip)) {
                                $zip = $zipMatch;
                            }
                        }
                    }
                }
            }

            // Log the address components
            \Log::info('Address components:', [
                'country' => $country,
                'city' => $city,
                'state' => $state,
                'zip' => $zip,
                'clientAddress' => $invoiceData['clientAddress'] ?? '',
                'clientAddress2' => $invoiceData['clientAddress2'] ?? ''
            ]);
            
            // Create invoice data array for our database
            $invoiceCreateData = [
                'user_id' => $user->id,
                'invoice_type' => $validated['invoiceType'],
                'company_name' => $companyName,
                'client_email' => $validated['recipientEmail'],
                'first_name' => $firstName,
                'last_name' => $lastName,
                'country' => $country,
                'city' => $city,
                'state' => $state,
                'zip' => $zip,
                'subtotal' => $subTotal,
                'tax_rate' => $taxRate,
                'tax_amount' => $taxAmount,
                'total' => $total,
                'invoice_date' => $invoiceDate,
                'due_date' => $dueDate,
                'status' => 'sent',
                'invoice_data' => $invoiceData,
                'payment_token' => $paymentToken,
            ];
            
            // Log the create data to verify fields are being set
            \Log::info('Invoice create data:', array_merge(
                array_diff_key($invoiceCreateData, ['invoice_data' => null]),
                ['invoice_data_keys' => is_array($invoiceData) ? array_keys($invoiceData) : 'not an array']
            ));
            
            // Prepare NMI API request data
            $nmiData = array_merge($nmiData, [
                'security_key' => $userProfile->private_key,
                'invoicing' => 'add_invoice',
                'amount' => number_format($total, 2, '.', ''),
                'email' => $validated['recipientEmail'],
                // Optional fields that we can populate from invoice data
                'payment_terms' => 'upon_receipt',
                'payment_methods_allowed' => 'cc', // Credit card only
                'order_description' => $invoiceData['notes'] ?? 'Invoice ' . ($invoiceData['invoiceTitle'] ?? ''),
                'orderid' => $invoiceData['invoiceTitle'] ?? ('INV-' . time()),
                'tax' => number_format($taxAmount, 2, '.', ''),
                'currency' => 'USD', // Default to USD
                'item_count' => count($invoiceData['productLines'] ?? []), // Add item count explicitly
                // Add subtotal to ensure it's properly accounted for
                'subtotal' => number_format($subTotal, 2, '.', '')
            ]);
            
            // Add customer name information - only add if not empty
            if (!empty($firstName)) {
                $nmiData['first_name'] = $firstName;
            }
            if (!empty($lastName)) {
                $nmiData['last_name'] = $lastName;
            }
            if (!empty($companyName)) {
                $nmiData['company'] = $companyName;
            }

            // Add address information if available
            if (!empty($invoiceData['clientAddress'])) {
                $nmiData['address1'] = $invoiceData['clientAddress'];
            }
            if (!empty($city)) {
                $nmiData['city'] = $city;
            }
            if (!empty($state)) {
                $nmiData['state'] = $state;
            }
            if (!empty($zip)) {
                $nmiData['zip'] = $zip;
            }
            if (!empty($country)) {
                $nmiData['country'] = $country;
            }
            
            // Log the request data (redacting the security key)
            $logData = $nmiData;
            $logData['security_key'] = '[REDACTED]';
            \Log::info('Sending invoice to NMI merchant portal', $logData);
            
            // Send the request to NMI
            $ch = curl_init('https://secure.nmi.com/api/transact.php');
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($nmiData));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            
            // Disable SSL verification for local development
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
            \Log::info('NMI Invoice API Response', [
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
            
            // Log the detailed response for debugging
            \Log::info('NMI Invoice API Response Details', [
                'http_code' => $httpCode,
                'raw_response' => $response,
                'parsed_response' => $responseData,
                'curl_error' => $curlError,
                'total_sent' => $total,
                'line_item_count' => count($invoiceData['productLines'] ?? [])
            ]);
            
            // Check if the invoice was created successfully
            if (isset($responseData['response']) && $responseData['response'] == 1) {
                // Extract invoice_id from the NMI response if available
                $nmiInvoiceId = $responseData['invoice_id'] ?? null;
                
                // Store the NMI invoice ID
                if ($nmiInvoiceId) {
                    $invoiceCreateData['nmi_invoice_id'] = $nmiInvoiceId;
                }
                
                // Create a record in our database
                $invoice = Invoice::create($invoiceCreateData);

                // Log the successful creation
                \Log::info('Invoice successfully created in NMI', [
                    'invoice_id' => $invoice->id,
                    'nmi_invoice_id' => $nmiInvoiceId,
                    'total' => $total
                ]);

                $invoiceData['nmi_invoice_id'] = $nmiInvoiceId;
                if (isset($firstName)) {
                    $invoiceData['client_first_name'] = $firstName;
                }
                
                // Send the email with the PDF attachment
                Mail::to($validated['recipientEmail'])
                    ->send(new SendInvoiceMail(
                        $invoiceData,
                        $user,
                        $decodedPdf,
                        $invoice->payment_token,
                        false,
                        $validated['invoiceType']
                    ));
                
                return response()->json([
                    'success' => true,
                    'message' => 'Invoice created in merchant portal and email sent successfully',
                    'invoice_id' => $invoice->id,
                    'nmi_invoice_id' => $nmiInvoiceId,
                    'nmi_response' => $responseData
                ]);
            } else {
                // Log the error details
                \Log::error('Failed to create invoice in NMI merchant portal', [
                    'response_code' => $responseData['response'] ?? 'unknown',
                    'response_text' => $responseData['responsetext'] ?? 'No response text',
                    'raw_response' => $response,
                    'sent_data' => $logData
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => $responseData['responsetext'] ?? 'Failed to create invoice in merchant portal',
                    'nmi_response' => $responseData
                ], 400);
            }
        } catch (\Exception $e) {
            \Log::error('Failed to send invoice to NMI: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to send invoice to NMI: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update invoice in NMI merchant portal by closing the old invoice and creating a new one
     * 
     * @param Request $request
     * @param Invoice $invoice
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateInvoiceInNmi(Request $request, Invoice $invoice)
    {
        try {
            // Check if the invoice is paid or closed
            if ($invoice->status === 'paid' || $invoice->status === 'closed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Paid or closed invoices cannot be updated.'
                ], 403);
            }
            
            $validated = $request->validate([
                'invoiceData' => 'required|array',
                'recipientEmail' => 'required|email',
                'pdfBase64' => 'required|string',
                'invoiceType' => 'required|in:general,real_estate',
            ]);

            // Get the authenticated user
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }
            
            // Check if the invoice belongs to the user
            if ($invoice->user_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to update this invoice'
                ], 403);
            }
            
            // Check if NMI invoice ID exists
            if (empty($invoice->nmi_invoice_id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No NMI invoice ID found for this invoice'
                ], 400);
            }
            
            // Get the user's profile
            $userProfile = UserProfile::where('user_id', $user->id)->first();
            if (!$userProfile) {
                return response()->json([
                    'success' => false,
                    'message' => 'User profile not found'
                ], 404);
            }

            // Check if the user has a private key
            if (empty($userProfile->private_key)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No API private key found for your account. Please contact your administrator.'
                ], 400);
            }

            // Process the PDF data
            $pdfContent = $validated['pdfBase64'];
            if (strpos($pdfContent, 'data:application/pdf;base64,') === 0) {
                $pdfContent = substr($pdfContent, 28);
            }
            
            // Decode the base64 content
            $decodedPdf = base64_decode($pdfContent);
            
            // Verify it's a valid PDF
            if (substr($decodedPdf, 0, 4) !== '%PDF') {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid PDF content'
                ], 400);
            }

            // STEP 1: Close the existing invoice in NMI
            $closeInvoiceData = [
                'security_key' => $userProfile->private_key,
                'invoicing' => 'close_invoice',
                'invoice_id' => $invoice->nmi_invoice_id
            ];
            
            // Log the close request data (redacting the security key)
            $closeLogData = $closeInvoiceData;
            $closeLogData['security_key'] = '[REDACTED]';
            \Log::info('Closing existing invoice in NMI', $closeLogData);
            
            // Send the close request to NMI
            $ch = curl_init('https://secure.nmi.com/api/transact.php');
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($closeInvoiceData));
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
            
            $closeResponse = curl_exec($ch);
            $closeHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $closeError = curl_error($ch);
            
            curl_close($ch);
            
            // Log the response
            \Log::info('NMI Close Invoice Response', [
                'http_code' => $closeHttpCode,
                'response' => $closeResponse,
                'curl_error' => $closeError
            ]);
            
            // Parse the close response
            parse_str($closeResponse, $closeResponseData);
            
            // Check if closing was successful or handle errors
            if ($closeError) {
                \Log::warning('Error closing invoice in NMI', [
                    'curl_error' => $closeError
                ]);
            } else if (!isset($closeResponseData['response']) || $closeResponseData['response'] != 1) {
                \Log::warning('Failed to close invoice in NMI, but continuing with creation', [
                    'response_data' => $closeResponseData
                ]);
            } else {
                \Log::info('Successfully closed invoice in NMI', [
                    'invoice_id' => $invoice->nmi_invoice_id
                ]);
            }
            
            // STEP 2: Create a new invoice in NMI
            
            // Extract invoice data
            $invoiceData = $validated['invoiceData'];
            
            // Calculate values to store in database
            $subTotal = 0;
            $nmiData = [];
            if (isset($invoiceData['productLines']) && is_array($invoiceData['productLines'])) {
                foreach ($invoiceData['productLines'] as $index => $line) {
                    $quantity = floatval($line['quantity'] ?? 0);
                    $rate = floatval($line['rate'] ?? 0);
                    $lineTotal = $quantity * $rate;
                    $subTotal += $lineTotal;
                    
                    $itemIndex = $index + 1;
                    
                    // Format 1: item_x notation (most reliable based on NMI docs)
                    $nmiData['item_product_code_' . $itemIndex] = 'ITEM' . $itemIndex;
                    $nmiData['item_description_' . $itemIndex] = $line['description'] ?? '';
                    $nmiData['item_unit_cost_' . $itemIndex] = number_format($rate, 2, '.', '');
                    $nmiData['item_quantity_' . $itemIndex] = (int)$quantity;
                    $nmiData['item_total_amount_' . $itemIndex] = number_format($lineTotal, 2, '.', '');
                    
                    // Format 2: Alternative format
                    $nmiData['itemdescription' . $itemIndex] = $line['description'] ?? '';
                    $nmiData['itemunitcost' . $itemIndex] = number_format($rate, 2, '.', '');
                    $nmiData['itemquantity' . $itemIndex] = (int)$quantity;
                    $nmiData['itemtotalamount' . $itemIndex] = number_format($lineTotal, 2, '.', '');
                }
                
                // Log the line item details for debugging
                \Log::info('Line item details for NMI:', [
                    'total_items' => count($invoiceData['productLines']),
                    'subTotal' => $subTotal,
                    'line_items' => array_filter($nmiData, function($key) {
                        return strpos($key, 'item_') === 0 || strpos($key, 'itemdescription') === 0;
                    }, ARRAY_FILTER_USE_KEY)
                ]);
            }
            
            // Extract tax rate from tax rate field or tax label
            $taxRate = 0;
            $taxAmount = 0;
            
            // First try to get tax rate directly from taxRate field
            if (isset($invoiceData['taxRate']) && is_numeric($invoiceData['taxRate'])) {
                $taxRate = floatval($invoiceData['taxRate']);
            }
            // If taxRate is not available, try to extract from taxLabel
            else if (isset($invoiceData['taxLabel'])) {
                preg_match('/(\d+)%/', $invoiceData['taxLabel'], $matches);
                if (isset($matches[1])) {
                    $taxRate = floatval($matches[1]);
                }
            }
            
            // Calculate tax amount if we have a valid tax rate
            if ($taxRate > 0) {
                $taxAmount = $subTotal * ($taxRate / 100);
            }
            
            $total = $subTotal + $taxAmount;
            
            // Parse dates
            $invoiceDate = isset($invoiceData['invoiceDate']) && !empty($invoiceData['invoiceDate']) 
                ? date('Y-m-d', strtotime($invoiceData['invoiceDate'])) 
                : date('Y-m-d');
                
            $dueDate = isset($invoiceData['invoiceDueDate']) && !empty($invoiceData['invoiceDueDate']) 
                ? date('Y-m-d', strtotime($invoiceData['invoiceDueDate'])) 
                : date('Y-m-d', strtotime('+30 days'));
            
            // Extract client name parts for first_name and last_name
            $firstName = $invoiceData['firstName'] ?? '';
            $lastName = $invoiceData['lastName'] ?? '';
            $companyName = $invoiceData['companyName'] ?? '';

            // Extract address components
            $country = $invoiceData['country'] ?? $invoiceData['clientCountry'] ?? '';
            $city = $invoiceData['city'] ?? '';
            $state = $invoiceData['state'] ?? '';
            $zip = $invoiceData['zip'] ?? '';

            // Try to extract city, state, zip from clientAddress2 if they're empty
            if (empty($city) || empty($state) || empty($zip)) {
                $cityStateZip = $invoiceData['clientAddress2'] ?? '';
                if (!empty($cityStateZip)) {
                    // Try to parse "City, State ZIP" format
                    $parts = explode(',', $cityStateZip);
                    
                    // If we have at least city
                    if (!empty($parts[0]) && empty($city)) {
                        $city = trim($parts[0]);
                    }
                    
                    // If we have state/zip part
                    if (!empty($parts[1])) {
                        $stateZipPart = trim($parts[1]);
                        
                        // Try to separate state and zip
                        preg_match('/([A-Z]{2})\s+(\d+)/', $stateZipPart, $matches);
                        
                        if (!empty($matches[1]) && empty($state)) {
                            $state = $matches[1];
                        }
                        
                        if (!empty($matches[2]) && empty($zip)) {
                            $zip = $matches[2];
                        } else {
                            // Just take numbers as zip if we couldn't match the pattern
                            $zipMatch = preg_replace('/[^0-9]/', '', $stateZipPart);
                            if (!empty($zipMatch) && empty($zip)) {
                                $zip = $zipMatch;
                            }
                        }
                    }
                }
            }

            // Create a new invoice in NMI using add_invoice
            $createInvoiceData = array_merge($nmiData, [
                'security_key' => $userProfile->private_key,
                'invoicing' => 'add_invoice',
                'amount' => number_format($total, 2, '.', ''),
                'email' => $validated['recipientEmail'],
                'payment_terms' => 'upon_receipt',
                'payment_methods_allowed' => 'cc', // Credit card only
                'order_description' => $invoiceData['notes'] ?? 'Invoice ' . ($invoiceData['invoiceTitle'] ?? ''),
                'tax' => number_format($taxAmount, 2, '.', ''),
                'currency' => 'USD', // Default to USD
                'item_count' => count($invoiceData['productLines'] ?? []), // Add item count explicitly
                'subtotal' => number_format($subTotal, 2, '.', '')
            ]);
            
            // Add customer name information - only add if not empty
            if (!empty($firstName)) {
                $createInvoiceData['first_name'] = $firstName;
            }
            if (!empty($lastName)) {
                $createInvoiceData['last_name'] = $lastName;
            }
            if (!empty($companyName)) {
                $createInvoiceData['company'] = $companyName;
            }

            // Add address information if available
            if (!empty($invoiceData['clientAddress'])) {
                $createInvoiceData['address1'] = $invoiceData['clientAddress'];
            }
            if (!empty($city)) {
                $createInvoiceData['city'] = $city;
            }
            if (!empty($state)) {
                $createInvoiceData['state'] = $state;
            }
            if (!empty($zip)) {
                $createInvoiceData['zip'] = $zip;
            }
            if (!empty($country)) {
                $createInvoiceData['country'] = $country;
            }
            
            // Log the request data (redacting the security key)
            $createLogData = $createInvoiceData;
            $createLogData['security_key'] = '[REDACTED]';
            \Log::info('Creating new invoice in NMI merchant portal', $createLogData);
            
            // Send the request to NMI
            $ch = curl_init('https://secure.nmi.com/api/transact.php');
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($createInvoiceData));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "accept: application/x-www-form-urlencoded",
                "content-type: application/x-www-form-urlencoded"
            ]);
            
            // Disable SSL verification for local development
            if (app()->environment('local')) {
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
            } else {
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 1);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
            }
            
            $createResponse = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            
            curl_close($ch);
            
            // Log the response
            \Log::info('NMI Create Invoice API Response', [
                'http_code' => $httpCode,
                'response' => $createResponse,
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
            parse_str($createResponse, $createResponseData);
            
            // Log the detailed response for debugging
            \Log::info('NMI Create Invoice API Response Details', [
                'http_code' => $httpCode,
                'raw_response' => $createResponse,
                'parsed_response' => $createResponseData,
                'curl_error' => $curlError,
                'total_sent' => $total,
                'line_item_count' => count($invoiceData['productLines'] ?? [])
            ]);
            
            // Check if the invoice was created successfully
            if (isset($createResponseData['response']) && $createResponseData['response'] == 1) {
                // Extract invoice_id from the NMI response if available
                $newNmiInvoiceId = $createResponseData['invoice_id'] ?? null;
                
                if (!$newNmiInvoiceId) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Failed to get new invoice ID from NMI response',
                        'nmi_response' => $createResponseData
                    ], 500);
                }
                
                // STEP 3: Update the existing invoice record in our database with the new NMI invoice ID
                $invoice->update([
                    'client_email' => $validated['recipientEmail'],
                    'subtotal' => $subTotal,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $taxAmount,
                    'total' => $total,
                    'invoice_date' => $invoiceDate,
                    'due_date' => $dueDate,
                    'invoice_data' => $invoiceData,
                    'nmi_invoice_id' => $newNmiInvoiceId,
                    // Also update address info
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'company_name' => $companyName,
                    'country' => $country,
                    'city' => $city,
                    'state' => $state,
                    'zip' => $zip,
                ]);
                
                \Log::info('Updated existing invoice record with new NMI invoice ID', [
                    'invoice_id' => $invoice->id,
                    'old_nmi_invoice_id' => $invoice->nmi_invoice_id,
                    'new_nmi_invoice_id' => $newNmiInvoiceId
                ]);
                
                // STEP 4: Optionally, send a new invoice notification
                $sendInvoiceData = [
                    'security_key' => $userProfile->private_key,
                    'invoicing' => 'send_invoice',
                    'invoice_id' => $newNmiInvoiceId
                ];
                
                // Log the send invoice request (redacting the security key)
                $sendLogData = $sendInvoiceData;
                $sendLogData['security_key'] = '[REDACTED]';
                \Log::info('Sending updated invoice from NMI', $sendLogData);
                
                // Send the request to NMI to send the invoice
                $ch = curl_init('https://secure.nmi.com/api/transact.php');
                curl_setopt($ch, CURLOPT_POST, 1);
                curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($sendInvoiceData));
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
                
                $sendResponse = curl_exec($ch);
                curl_close($ch);
                
                // Log the send invoice response
                \Log::info('NMI Send Invoice Response', [
                    'response' => $sendResponse
                ]);
                
                // Send the email with the updated PDF attachment through our system as well
                Mail::to($validated['recipientEmail'])
                    ->send(new SendInvoiceMail(
                        $invoiceData,
                        $user,
                        $decodedPdf,
                        $invoice->payment_token,
                        true,
                        $validated['invoiceType']
                    ));
                
                return response()->json([
                    'success' => true,
                    'message' => 'Invoice updated in merchant portal and email sent successfully',
                    'invoice_id' => $invoice->id,
                    'old_nmi_invoice_id' => $invoice->nmi_invoice_id,
                    'new_nmi_invoice_id' => $newNmiInvoiceId,
                    'nmi_response' => $createResponseData
                ]);
            } else {
                // Log the error details
                \Log::error('Failed to create new invoice in NMI merchant portal', [
                    'response_code' => $createResponseData['response'] ?? 'unknown',
                    'response_text' => $createResponseData['responsetext'] ?? 'No response text',
                    'raw_response' => $createResponse,
                    'sent_data' => $createLogData
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => $createResponseData['responsetext'] ?? 'Failed to create invoice in merchant portal',
                    'nmi_response' => $createResponseData
                ], 400);
            }
        } catch (\Exception $e) {
            \Log::error('Failed to update invoice in NMI: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update invoice in NMI: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Close an invoice instead of deleting it
     *
     * @param Invoice $invoice
     * @return \Illuminate\Http\JsonResponse
     */
    public function closeInvoice(Invoice $invoice)
    {
        try {
            // Check if the invoice belongs to the authenticated user
            if ($invoice->user_id !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized action.'
                ], 403);
            }
            
            // Check if invoice is already closed
            if ($invoice->status === 'closed') {
                return response()->json([
                    'success' => true,
                    'message' => 'Invoice is already closed.',
                    'invoice' => $invoice
                ]);
            }
            
            // Get the user's profile
            $userProfile = UserProfile::where('user_id', Auth::id())->first();
            if (!$userProfile) {
                return response()->json([
                    'success' => false,
                    'message' => 'User profile not found'
                ], 404);
            }

            // Check if the user has a private key
            if (empty($userProfile->private_key)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No API private key found for your account. Please contact your administrator.'
                ], 400);
            }
            
            // Close the invoice in NMI if it has an NMI invoice ID
            if (!empty($invoice->nmi_invoice_id)) {
                $closeInvoiceData = [
                    'security_key' => $userProfile->private_key,
                    'invoicing' => 'close_invoice',
                    'invoice_id' => $invoice->nmi_invoice_id
                ];
                
                // Log the close request data (redacting the security key)
                $closeLogData = $closeInvoiceData;
                $closeLogData['security_key'] = '[REDACTED]';
                \Log::info('Closing invoice in NMI', $closeLogData);
                
                // Send the close request to NMI
                $ch = curl_init('https://secure.nmi.com/api/transact.php');
                curl_setopt($ch, CURLOPT_POST, 1);
                curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($closeInvoiceData));
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
                $error = curl_error($ch);
                
                curl_close($ch);
                
                // Log the response
                \Log::info('NMI Close Invoice Response', [
                    'http_code' => $httpCode,
                    'response' => $response,
                    'curl_error' => $error
                ]);
                
                // Parse the response
                parse_str($response, $responseData);
                
                // Check if closing was successful
                if (!isset($responseData['response']) || $responseData['response'] != 1) {
                    \Log::warning('Failed to close invoice in NMI', [
                        'response_data' => $responseData
                    ]);
                    
                    // Return error if the NMI operation failed
                    return response()->json([
                        'success' => false,
                        'message' => $responseData['responsetext'] ?? 'Failed to close invoice in NMI',
                        'nmi_response' => $responseData
                    ], 400);
                }
                
                \Log::info('Successfully closed invoice in NMI', [
                    'invoice_id' => $invoice->id,
                    'nmi_invoice_id' => $invoice->nmi_invoice_id
                ]);
            }
            
            // Update invoice status to closed in our database
            $invoice->status = 'closed';
            $invoice->closed_at = now();
            $invoice->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Invoice closed successfully',
                'invoice' => $invoice
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to close invoice: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to close invoice: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show an invoice in read-only mode.
     *
     * @param Invoice $invoice
     * @return \Inertia\Response
     */
    public function show(Invoice $invoice)
    {
        // Check if the invoice belongs to the authenticated user
        if ($invoice->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }
        
        return Inertia::render('User/ViewInvoice', [
            'invoice' => $invoice
        ]);
    }

    /**
     * Test Bead API Authentication
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
                    'access_token' => substr($response, 0, 50) . '...', // Only show first 50 chars for security
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

    /**
     * Handle Bead payment webhook
     */
    public function handleBeadWebhook(Request $request)
    {
        try {
            $beadService = new BeadPaymentService();
            return $beadService->handleBeadWebhook($request);
        } catch (Exception $e) {
            Log::error('Failed to process Bead webhook in controller: ' . $e->getMessage());
            // Still return 200 to prevent retries, following the same pattern as the service
            return response()->json(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    // Add this method after handleBeadWebhook
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
            
            // Check payment status from Bead API
            $beadService = new BeadPaymentService();
            $paymentStatus = $beadService->checkPaymentStatus($trackingId);

            Log::info('Payment status', [
                'paymentStatus' => $paymentStatus
            ]);
            
            // Update invoice status if payment is completed
            if (isset($paymentStatus['status_code']) && $paymentStatus['status_code'] === 'completed') {
                $invoice->status = 'paid';
                $invoice->payment_date = now();
                $invoice->save();
                
                
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
            
            // For other statuses, just return the status without updating the invoice
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
            \Log::error('Payment verification error: ' . $e->getMessage(), [
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
     * Get an invoice by its NMI invoice ID
     *
     * @param string $nmiInvoiceId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getByNmiInvoiceId(string $nmiInvoiceId)
    {
        try {
            // Find the invoice by NMI invoice ID
            $invoice = Invoice::where('nmi_invoice_id', $nmiInvoiceId)->first();
            
            if (!$invoice) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invoice not found with the provided NMI invoice ID'
                ], 404);
            }
            
            // Parse the invoice_data JSON if it's stored as a string
            $invoiceData = is_string($invoice->invoice_data) 
                ? json_decode($invoice->invoice_data, true) 
                : $invoice->invoice_data;
            
            return response()->json([
                'success' => true,
                'invoice' => $invoice,
                'invoiceData' => $invoiceData
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to retrieve invoice by NMI ID: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving invoice: ' . $e->getMessage()
            ], 500);
        }
    }
}
