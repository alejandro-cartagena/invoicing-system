<?php

namespace App\Http\Controllers;

use App\Mail\SendInvoiceMail;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;

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
            
            // Extract tax rate from tax label (e.g., "Tax (10%)" -> 10)
            $taxRate = 0;
            $taxAmount = 0;
            if (isset($invoiceData['taxLabel'])) {
                preg_match('/(\d+)%/', $invoiceData['taxLabel'], $matches);
                if (isset($matches[1])) {
                    $taxRate = floatval($matches[1]);
                    $taxAmount = $subTotal * ($taxRate / 100);
                }
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
            
            // Create invoice data array
            $invoiceCreateData = [
                'user_id' => $user->id,
                'invoice_type' => $validated['invoiceType'],
                'invoice_number' => $invoiceData['invoiceTitle'] ?? ('INV-' . time()),
                'client_name' => $invoiceData['clientName'] ?? 'Client',
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
    
    public function index()
    {
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
            ->where('status', '!=', 'paid')
            ->firstOrFail();
            
        return Inertia::render('Payment/CreditCard', [
            'invoice' => $invoice,
            'token' => $token
        ]);
    }

    public function showBitcoinPayment(string $token)
    {
        $invoice = Invoice::where('payment_token', $token)
            ->where('status', '!=', 'paid')
            ->firstOrFail();
            
        return Inertia::render('Payment/Bitcoin', [
            'invoice' => $invoice,
            'token' => $token
        ]);
    }

    public function processCreditCardPayment(Request $request)
    {
        try {
            // Log the raw request data for debugging
            \Log::info('Raw payment request data:', $request->all());
            
            $validated = $request->validate([
                'token' => 'required|string',
                'invoiceId' => 'required|integer',
                'amount' => 'required|numeric',
                'firstName' => 'required|string|max:255',
                'lastName' => 'required|string|max:255',
                'address' => 'required|string|max:255',
                'city' => 'required|string|max:255',
                'state' => 'required|string|max:255',
                'zip' => 'required|string|max:20',
                'phone' => 'required|string|max:20',
            ]);
            
            // Log the validated data
            \Log::info('Validated payment data:', $validated);
            
            // Find the invoice
            $invoice = Invoice::findOrFail($validated['invoiceId']);
            
            // Check if the invoice is already paid
            if ($invoice->status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'This invoice has already been paid.'
                ], 400);
            }
            
            // Log the token for debugging
            \Log::info('Payment token received', [
                'token' => $validated['token'],
                'is_test_token' => in_array($validated['token'], [
                    '00000000-000000-000000-000000000000',
                    '11111111-111111-111111-111111111111'
                ])
            ]);
            
            // Only simulate for specific test tokens
            if (in_array($validated['token'], [
                '00000000-000000-000000-000000000000',
                '11111111-111111-111111-111111111111'
            ])) {
                \Log::info('Using predefined test token, simulating successful payment');
                
                // Update the invoice status
                $invoice->status = 'paid';
                $invoice->payment_date = now();
                $invoice->transaction_id = 'TEST-' . uniqid();
                $invoice->save();
                
                return response()->json([
                    'success' => true,
                    'message' => 'Test payment processed successfully',
                    'transaction_id' => $invoice->transaction_id,
                    'auth_code' => 'TEST123'
                ]);
            }
            
            // Prepare the payment data
            $paymentData = [
                'security_key' => env('DVF_PRIVATE_KEY', 'B6z4wK8d42A82b2vn89WQ578xHCxDQEc'),
                'payment_token' => $validated['token'],
                'type' => 'sale',
                'amount' => $validated['amount'],
                'first_name' => $validated['firstName'],
                'last_name' => $validated['lastName'],
                'address1' => $validated['address'],
                'city' => $validated['city'],
                'state' => $validated['state'],
                'zip' => $validated['zip'],
                'phone' => $validated['phone'],
                'order_id' => $invoice->invoice_number,
                'customer_id' => $invoice->client_email,
                'currency' => 'USD',
            ];
            
            \Log::info('Sending payment request to gateway', [
                'url' => 'https://dvfsolutions.transactiongateway.com/api/transact.php',
                'data' => array_merge($paymentData, ['security_key' => '[REDACTED]'])
            ]);
            
            // Send the payment request to DVF Solutions
            $ch = curl_init('https://dvfsolutions.transactiongateway.com/api/transact.php');
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($paymentData));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            
            // Disable SSL verification for local development
            if (app()->environment('local')) {
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
            } else {
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 1);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
            }
            
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            $response = curl_exec($ch);
            
            // Check for cURL errors
            if (curl_errno($ch)) {
                $error = curl_error($ch);
                \Log::error('cURL error: ' . $error);
                curl_close($ch);
                throw new \Exception('cURL error: ' . $error);
            }
            
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            // Log the raw response for debugging
            \Log::info('Payment gateway raw response', [
                'http_code' => $httpCode,
                'response' => $response
            ]);
            
            // Check if we got a valid HTTP response
            if ($httpCode != 200) {
                throw new \Exception('Payment gateway returned HTTP code ' . $httpCode);
            }
            
            // Parse the response
            parse_str($response, $responseData);
            \Log::info('Payment gateway parsed response', $responseData);
            
            // Check if the payment was successful
            if (isset($responseData['response']) && $responseData['response'] == 1) {
                // Update the invoice status
                $invoice->status = 'paid';
                $invoice->payment_date = now();
                $invoice->transaction_id = $responseData['transactionid'] ?? null;
                $invoice->save();
                
                // Return success response
                return response()->json([
                    'success' => true,
                    'message' => 'Payment processed successfully',
                    'transaction_id' => $responseData['transactionid'] ?? null,
                    'auth_code' => $responseData['authcode'] ?? null
                ]);
            } else {
                // Return error response
                return response()->json([
                    'success' => false,
                    'message' => $responseData['responsetext'] ?? 'Payment processing failed',
                    'error_code' => $responseData['response_code'] ?? null
                ], 400);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation error: ' . json_encode($e->errors()));
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while processing your payment: ' . implode(' ', array_map(function($errors) {
                    return implode(' ', $errors);
                }, $e->errors()))
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Payment processing error: ' . $e->getMessage(), [
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

    public function processBitcoinPayment(Request $request)
    {
        // This will be implemented when you integrate with the Bitcoin payment gateway
        // For now, just return a placeholder response
        return response()->json([
            'success' => true,
            'message' => 'Bitcoin payment processing will be implemented soon'
        ]);
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
            
            // Extract tax rate from tax label (e.g., "Tax (10%)" -> 10)
            $taxRate = 0;
            $taxAmount = 0;
            if (isset($invoiceData['taxLabel'])) {
                preg_match('/(\d+)%/', $invoiceData['taxLabel'], $matches);
                if (isset($matches[1])) {
                    $taxRate = floatval($matches[1]);
                    $taxAmount = $subTotal * ($taxRate / 100);
                }
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
                'invoice_number' => $invoiceData['invoiceTitle'] ?? ('INV-' . time()),
                'client_name' => $invoiceData['clientName'] ?? 'Client',
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
}
