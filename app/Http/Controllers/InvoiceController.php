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
use App\Mail\MerchantPaymentReceiptMail;
use App\Models\BeadCredential;
use App\Models\Customer;

class InvoiceController extends Controller
{
    
    /**
     * Display a listing of all invoices for the authenticated user
     * 
     * This method retrieves all invoices for the current user, updates statuses for overdue invoices,
     * and formats dates before returning the data to the view.
     * 
     * @return \Inertia\Response Renders the invoices list view with invoice data
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

    /**
     * Show an invoice in read-only mode
     * 
     * This method verifies that the invoice belongs to the authenticated user
     * before displaying it in a read-only view.
     * 
     * @param Invoice $invoice The invoice to be displayed
     * @return \Inertia\Response Renders the view-only invoice page
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
     * Create and send an invoice to a customer
     * 
     * This method handles the complete invoice creation and sending process:
     * - Creates the invoice in the NMI merchant portal
     * - Stores the invoice in the local database
     * - Sends an email to the recipient with payment options
     *   (credit card via NMI and cryptocurrency if available)
     * 
     * @param Request $request Contains invoice data, recipient email, PDF content, and invoice type
     * @return \Illuminate\Http\JsonResponse Success/failure response with invoice details
     */
    public function sendInvoice(Request $request)
    {
        try {
            $validated = $request->validate([
                'invoiceData' => 'required|array',
                'recipientEmail' => 'required|email',
                'pdfBase64' => 'required|string',
                'invoiceType' => 'required|in:general,real_estate',
                'customerId' => 'nullable|integer|exists:customers,id',
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

            // Process invoice data using the new function
            $invoiceData = $validated['invoiceData'];
            
            // Auto-create customer if one doesn't exist for this email
            $customer = null;
            if (!empty($validated['recipientEmail'])) {
                // Check if customer already exists for this user and email
                $customer = Customer::where('user_id', $user->id)
                                  ->where('email', $validated['recipientEmail'])
                                  ->first();
                
                if (!$customer) {
                    // Auto-create a customer with minimal information
                    try {
                        $customerData = [
                            'user_id' => $user->id,
                            'email' => $validated['recipientEmail'],
                            'first_name' => $invoiceData['firstName'] ?? null,
                            'last_name' => $invoiceData['lastName'] ?? null,
                            'company' => $invoiceData['companyName'] ?? null,
                        ];
                        
                        $customer = Customer::create($customerData);
                        
                        \Log::info('Auto-created customer', [
                            'customer_id' => $customer->id,
                            'email' => $validated['recipientEmail'],
                            'user_id' => $user->id
                        ]);
                    } catch (\Exception $e) {
                        \Log::warning('Failed to auto-create customer, continuing without customer link', [
                            'error' => $e->getMessage(),
                            'email' => $validated['recipientEmail']
                        ]);
                    }
                }
            }
            
            // Use the existing customer ID or the newly created one
            $customerId = $customer ? $customer->id : ($validated['customerId'] ?? null);
            
            $processedData = $this->processInvoiceData($invoiceData, $validated['recipientEmail'], $validated['invoiceType'], $customerId);
            
            // Add required fields that aren't in processInvoiceData
            $processedData['user_id'] = $user->id;
            $processedData['invoice_type'] = $validated['invoiceType'];
            
            // Generate a unique payment token
            $paymentToken = Str::random(64);
            
            // Prepare NMI API request data
            $nmiData = [
                'security_key' => $userProfile->private_key,
                'invoicing' => 'add_invoice',
                'amount' => number_format($processedData['total'], 2, '.', ''),
                'email' => $processedData['client_email'],
                'payment_terms' => 'upon_receipt',
                'payment_methods_allowed' => 'cc', // Credit card only
                'order_description' => $invoiceData['notes'] ?? 'Invoice ' . ($invoiceData['invoiceTitle'] ?? ''),
                'orderid' => $invoiceData['invoiceTitle'] ?? ('INV-' . time()),
                'tax' => number_format($processedData['tax_amount'], 2, '.', ''),
                'currency' => 'USD', // Default to USD
                'subtotal' => number_format($processedData['subtotal'], 2, '.', '')
            ];
            
            // Add customer information if available
            if (!empty($processedData['first_name'])) {
                $nmiData['first_name'] = $processedData['first_name'];
            }
            if (!empty($processedData['last_name'])) {
                $nmiData['last_name'] = $processedData['last_name'];
            }
            if (!empty($processedData['company_name'])) {
                $nmiData['company'] = $processedData['company_name'];
            }

            // Add address information if available
            if (!empty($processedData['country'])) {
                $nmiData['country'] = $processedData['country'];
            }
            if (!empty($processedData['city'])) {
                $nmiData['city'] = $processedData['city'];
            }
            if (!empty($processedData['state'])) {
                $nmiData['state'] = $processedData['state'];
            }
            if (!empty($processedData['zip'])) {
                $nmiData['zip'] = $processedData['zip'];
            }

            // Add line items if present
            if (isset($invoiceData['productLines']) && is_array($invoiceData['productLines'])) {
                foreach ($invoiceData['productLines'] as $index => $line) {
                    $itemIndex = $index + 1;
                    $quantity = floatval($line['quantity'] ?? 0);
                    $rate = floatval($line['rate'] ?? 0);
                    $lineTotal = $quantity * $rate;
                    
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
                
                $nmiData['item_count'] = count($invoiceData['productLines']);
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
            
            // Check if the invoice was created successfully
            if (isset($responseData['response']) && $responseData['response'] == 1) {
                // Extract invoice_id from the NMI response if available
                $nmiInvoiceId = $responseData['invoice_id'] ?? null;
                
                // Add NMI invoice ID and payment token to the processed data
                $processedData['nmi_invoice_id'] = $nmiInvoiceId;
                $processedData['payment_token'] = $paymentToken;
                $processedData['status'] = 'sent';
                
                try {
                    // Create a record in our database
                    $invoice = Invoice::create($processedData);

                    // Log the successful creation
                    \Log::info('Invoice successfully created in NMI', [
                        'invoice_id' => $invoice->id,
                        'nmi_invoice_id' => $nmiInvoiceId,
                        'total' => $processedData['total']
                    ]);

                    // Add NMI invoice ID to the invoice data for the email
                    $invoiceData['nmi_invoice_id'] = $invoice->nmi_invoice_id;

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
        } catch (\Exception $e) {
                    \Log::error('Failed to create invoice in database', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                        'processed_data' => array_diff_key($processedData, ['invoice_data' => null])
            ]);
            
            return response()->json([
                'success' => false,
                        'message' => 'Failed to create invoice in database: ' . $e->getMessage()
            ], 500);
        }
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
                'trace' => $e->getTraceAsString(),
                'request_data' => [
                    'invoice_type' => $validated['invoiceType'] ?? null,
                    'recipient_email' => $validated['recipientEmail'] ?? null,
                    'has_invoice_data' => isset($validated['invoiceData']),
                    'has_pdf' => isset($validated['pdfBase64'])
                ]
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to send invoice to NMI: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Resend an existing invoice to a recipient
     * 
     * This method verifies ownership, checks if the invoice can be resent,
     * validates the request data, and sends the invoice via email to the recipient.
     * 
     * @param Invoice $invoice The invoice to resend
     * @param Request $request Contains PDF content, recipient email, and real estate fields if applicable
     * @return \Illuminate\Http\JsonResponse Success/failure message
     */
    public function resendInvoice(Invoice $invoice, Request $request)
    {
        // Check if the invoice belongs to the authenticated user
        if ($invoice->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }
        
        // Check if the invoice is paid or closed
        if ($invoice->status === 'paid' || $invoice->status === 'closed') {
            return redirect()->route('user.invoices')
                ->with('error', 'Paid or closed invoices cannot be resent.');
        }

        // Validate the request
        $validated = $request->validate([
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
            return redirect()->route('user.invoices')
                ->with('error', 'User not authenticated');
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
            return redirect()->route('user.invoices')
                ->with('error', 'Invalid PDF content');
        }

        // Get the invoice data
        $invoiceData = $invoice->invoice_data;
        
        // If this is a real estate invoice, ensure the fields are included
        if ($invoice->invoice_type === 'real_estate') {
            $invoiceData = array_merge($invoiceData, [
                'propertyAddress' => $validated['propertyAddress'] ?? $invoice->property_address,
                'titleNumber' => $validated['titleNumber'] ?? $invoice->title_number,
                'buyerName' => $validated['buyerName'] ?? $invoice->buyer_name,
                'sellerName' => $validated['sellerName'] ?? $invoice->seller_name,
                'agentName' => $validated['agentName'] ?? $invoice->agent_name
            ]);
        }
        
        // Add NMI invoice ID to the invoice data for the email
        $invoiceData['nmi_invoice_id'] = $invoice->nmi_invoice_id;
        
        // Send the email with the decoded PDF content
        Mail::to($validated['recipientEmail'])
            ->send(new SendInvoiceMail(
                $invoiceData,
                $user,
                $decodedPdf,
                $invoice->payment_token,
                false,
                $invoice->invoice_type
            ));
        
            return response()->json([
                'success' => true,
                'message' => 'Invoice resent successfully'
            ]);
    }

    /**
     * Delete an invoice
     * 
     * This method verifies that the invoice belongs to the authenticated user
     * before deleting it from the database.
     * 
     * @param Invoice $invoice The invoice to be deleted
     * @return \Illuminate\Http\RedirectResponse Redirects to the invoices list with success message
     */
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

    /**
     * Download invoice data for the authenticated user
     * 
     * This method verifies ownership of the invoice and returns the invoice data
     * in JSON format. It handles both string and array formats of invoice_data,
     * ensuring proper JSON decoding when needed.
     * 
     * @param Invoice $invoice The invoice to download
     * @return \Illuminate\Http\JsonResponse JSON response containing invoice details and parsed invoice data
     * @throws \Illuminate\Auth\Access\AuthorizationException If user doesn't own the invoice
     */
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
     * Show the form for editing the specified invoice
     * 
     * This method verifies ownership, checks if the invoice can be edited,
     * and renders the appropriate edit form based on invoice type.
     * 
     * @param Invoice $invoice The invoice to be edited
     * @return \Inertia\Response Renders the edit form with invoice data
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
     * Resend an invoice after editing by creating a new invoice and deleting the old one
     * 
     * This method validates the request data, checks if the invoice can be edited,
     * creates a new invoice with the updated information, sends an email to the recipient,
     * and deletes the old invoice.
     * 
     * @param Request $request Contains invoice data, PDF content, recipient email, and real estate fields if applicable
     * @param Invoice $invoice The original invoice to be replaced
     * @return \Illuminate\Http\JsonResponse Success/failure message and new invoice ID
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
     * Update invoice in NMI merchant portal by closing the old invoice and creating a new one
     * 
     * This method validates the request, closes the existing invoice in NMI,
     * creates a new invoice with updated information, updates the database record,
     * and sends an email to the recipient.
     * 
     * @param Request $request Contains invoice data, PDF content, and recipient email
     * @param Invoice $invoice The invoice to be updated
     * @return \Illuminate\Http\JsonResponse Success/failure message and updated invoice details
     */
    public function replaceInvoice(Request $request, Invoice $invoice)
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
                'customerId' => 'nullable|integer|exists:customers,id',
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
            
            // Auto-create customer if one doesn't exist for this email
            $customer = null;
            if (!empty($validated['recipientEmail'])) {
                // Check if customer already exists for this user and email
                $customer = Customer::where('user_id', $user->id)
                                  ->where('email', $validated['recipientEmail'])
                                  ->first();
                
                if (!$customer) {
                    // Auto-create a customer with minimal information
                    try {
                        $customerData = [
                            'user_id' => $user->id,
                            'email' => $validated['recipientEmail'],
                            'first_name' => $validated['invoiceData']['firstName'] ?? null,
                            'last_name' => $validated['invoiceData']['lastName'] ?? null,
                            'company' => $validated['invoiceData']['companyName'] ?? null,
                        ];
                        
                        $customer = Customer::create($customerData);
                        
                        \Log::info('Auto-created customer during invoice update', [
                            'customer_id' => $customer->id,
                            'email' => $validated['recipientEmail'],
                            'user_id' => $user->id
                        ]);
                    } catch (\Exception $e) {
                        \Log::warning('Failed to auto-create customer during update, continuing without customer link', [
                            'error' => $e->getMessage(),
                            'email' => $validated['recipientEmail']
                        ]);
                    }
                }
            }
            
            // Use the existing customer ID or the newly created one
            $customerId = $customer ? $customer->id : ($validated['customerId'] ?? null);
            
            $nmiData = [
                'security_key' => $userProfile->private_key,
                'invoicing' => 'add_invoice',
                'amount' => number_format($invoice->total, 2, '.', ''),
                'email' => $validated['recipientEmail'],
                'payment_terms' => 'upon_receipt',
                'payment_methods_allowed' => 'cc',
                'order_description' => $validated['invoiceData']['notes'] ?? 'Invoice ' . ($validated['invoiceData']['invoiceTitle'] ?? ''),
                'orderid' => $validated['invoiceData']['invoiceTitle'] ?? ('INV-' . time()),
                'tax' => number_format($invoice->tax_amount, 2, '.', ''),
                'currency' => 'USD',
                'subtotal' => number_format($invoice->subtotal, 2, '.', '')
            ];

            // Add customer information
            if (!empty($invoice->first_name)) {
                $nmiData['first_name'] = $invoice->first_name;
            }
            if (!empty($invoice->last_name)) {
                $nmiData['last_name'] = $invoice->last_name;
            }
            if (!empty($invoice->company_name)) {
                $nmiData['company'] = $invoice->company_name;
            }

            // Add address information
            if (!empty($invoice->country)) {
                $nmiData['country'] = $invoice->country;
            }
            if (!empty($invoice->city)) {
                $nmiData['city'] = $invoice->city;
            }
            if (!empty($invoice->state)) {
                $nmiData['state'] = $invoice->state;
            }
            if (!empty($invoice->zip)) {
                $nmiData['zip'] = $invoice->zip;
            }

            // Add line items
            if (isset($validated['invoiceData']['productLines']) && is_array($validated['invoiceData']['productLines'])) {
                foreach ($validated['invoiceData']['productLines'] as $index => $line) {
                    $itemIndex = $index + 1;
                    $quantity = floatval($line['quantity'] ?? 0);
                    $rate = floatval($line['rate'] ?? 0);
                    $lineTotal = $quantity * $rate;
                    
                    $nmiData['item_product_code_' . $itemIndex] = 'ITEM' . $itemIndex;
                    $nmiData['item_description_' . $itemIndex] = $line['description'] ?? '';
                    $nmiData['item_unit_cost_' . $itemIndex] = number_format($rate, 2, '.', '');
                    $nmiData['item_quantity_' . $itemIndex] = (int)$quantity;
                    $nmiData['item_total_amount_' . $itemIndex] = number_format($lineTotal, 2, '.', '');
                }
                
                $nmiData['item_count'] = count($validated['invoiceData']['productLines']);
            }

            // Send the request to NMI
            $ch = curl_init('https://secure.nmi.com/api/transact.php');
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($nmiData));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            
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
            
            // Parse the response
            parse_str($response, $responseData);
            
            if (isset($responseData['response']) && $responseData['response'] == 1) {
                // STEP 3: Update the existing invoice record with the new data
                $updateData = $this->processInvoiceData(
                    $validated['invoiceData'], 
                    $validated['recipientEmail'],
                    $validated['invoiceType'],
                    $customerId
                );
                
                // Add NMI invoice ID and status
                $updateData['nmi_invoice_id'] = $responseData['invoice_id'];
                $updateData['status'] = 'sent';
                
                // Generate a new payment token to invalidate old payment links
                $updateData['payment_token'] = Str::random(64);

                // Update the existing invoice
                $invoice->update($updateData);

                // Add NMI invoice ID to the invoice data for the email
                $validated['invoiceData']['nmi_invoice_id'] = $responseData['invoice_id'];

                // Send the email with the PDF attachment
                Mail::to($validated['recipientEmail'])
                    ->send(new SendInvoiceMail(
                        $validated['invoiceData'],
                        $user,
                        base64_decode($validated['pdfBase64']),
                        $updateData['payment_token'], // Use the new payment token
                        false,
                        $validated['invoiceType']
                    ));

                return response()->json([
                    'success' => true,
                    'message' => 'Invoice updated in merchant portal and email sent successfully',
                    'invoice_id' => $invoice->id,
                    'old_nmi_invoice_id' => $invoice->nmi_invoice_id,
                    'new_nmi_invoice_id' => $responseData['invoice_id'],
                    'nmi_response' => $responseData
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $responseData['responsetext'] ?? 'Failed to update invoice in NMI',
                    'nmi_response' => $responseData
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
     * This method verifies ownership, checks if the invoice is already closed,
     * closes the invoice in the NMI system if it has an NMI invoice ID,
     * and updates the invoice status in the database.
     * 
     * @param Invoice $invoice The invoice to be closed
     * @return \Illuminate\Http\JsonResponse Success/failure message and updated invoice
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
     * Get an invoice by its NMI invoice ID
     * 
     * This method finds an invoice using the NMI invoice ID instead of the primary key,
     * parses the invoice data if needed, and returns the invoice information.
     * 
     * @param string $nmiInvoiceId The NMI invoice ID to search for
     * @return \Illuminate\Http\JsonResponse Invoice details and parsed invoice data
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

    /**
     * Process invoice data and calculate all necessary values
     * 
     * This method calculates subtotal, tax amount, and total from product lines,
     * extracts dates, client information, and address details from invoice data,
     * and adds real estate specific fields for real estate invoices.
     * 
     * @param array $invoiceData The raw invoice data containing product lines and other information
     * @param string $recipientEmail The email address of the invoice recipient
     * @param string $invoiceType The type of invoice (general or real_estate)
     * @param int|null $customerId The ID of the customer to associate with this invoice
     * @return array Processed invoice data with calculated values
     */
    private function processInvoiceData(array $invoiceData, string $recipientEmail, string $invoiceType = 'general', ?int $customerId = null): array
    {
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

        // Base data array
        $data = [
            'client_email' => $recipientEmail,
            'customer_id' => $customerId,
            'subtotal' => $subTotal,
            'tax_rate' => $taxRate,
            'tax_amount' => $taxAmount,
            'total' => $total,
            'invoice_date' => $invoiceDate,
            'due_date' => $dueDate,
            'invoice_data' => $invoiceData,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'company_name' => $companyName,
            'country' => $country,
            'city' => $city,
            'state' => $state,
            'zip' => $zip,
        ];

        // Add real estate specific fields if this is a real estate invoice
        if ($invoiceType === 'real_estate') {
            $data = array_merge($data, [
                'property_address' => $invoiceData['propertyAddress'] ?? '',
                'title_number' => $invoiceData['titleNumber'] ?? '',
                'buyer_name' => $invoiceData['buyerName'] ?? '',
                'seller_name' => $invoiceData['sellerName'] ?? '',
                'agent_name' => $invoiceData['agentName'] ?? '',
            ]);
        }

        return $data;
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
}
