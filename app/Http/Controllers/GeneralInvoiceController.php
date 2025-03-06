<?php

namespace App\Http\Controllers;

use App\Mail\SendGeneralInvoiceMail;
use App\Models\GeneralInvoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;

class GeneralInvoiceController extends Controller
{
    public function sendEmail(Request $request)
    {
        try {
            $validated = $request->validate([
                'invoiceData' => 'required|array',
                'pdfBase64' => 'required|string',
                'recipientEmail' => 'required|email',
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
            
            // Save invoice to database
            $invoice = GeneralInvoice::create([
                'user_id' => $user->id,
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
                ->send(new SendGeneralInvoiceMail(
                    $invoiceData,
                    $user,
                    $decodedPdf, // Pass the decoded PDF content
                    $invoice->payment_token // Pass the payment token
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
        $invoices = GeneralInvoice::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get();
            
        return Inertia::render('User/Invoices', [
            'invoices' => $invoices
        ]);
    }

    public function showCreditCardPayment(string $token)
    {
        $invoice = GeneralInvoice::where('payment_token', $token)
            ->where('status', '!=', 'paid')
            ->firstOrFail();
            
        return Inertia::render('Payment/CreditCard', [
            'invoice' => $invoice,
            'token' => $token
        ]);
    }

    public function showBitcoinPayment(string $token)
    {
        $invoice = GeneralInvoice::where('payment_token', $token)
            ->where('status', '!=', 'paid')
            ->firstOrFail();
            
        return Inertia::render('Payment/Bitcoin', [
            'invoice' => $invoice,
            'token' => $token
        ]);
    }

    public function processCreditCardPayment(Request $request)
    {
        // This will be implemented when you integrate with the payment gateway
        // For now, just return a placeholder response
        return response()->json([
            'success' => true,
            'message' => 'Payment processing will be implemented soon'
        ]);
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

    public function destroy(GeneralInvoice $invoice)
    {
        // Check if the invoice belongs to the authenticated user
        if ($invoice->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }
        
        // Delete the invoice
        $invoice->delete();
        
        return redirect()->route('user.invoices')->with('success', 'Invoice deleted successfully');
    }

    public function resend(GeneralInvoice $invoice)
    {
        // Check if the invoice belongs to the authenticated user
        if ($invoice->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }
        
        // Get the user
        $user = Auth::user();
        
        // Regenerate the PDF from the stored invoice data
        $invoiceData = $invoice->invoice_data;
        
        // You'll need to implement the PDF generation logic here
        // For now, we'll use a placeholder
        $pdf = PDF::loadView('pdfs.invoice', ['data' => $invoiceData]);
        $pdfContent = $pdf->output();
        
        // Send the email with the PDF attachment
        Mail::to($invoice->client_email)
            ->send(new SendGeneralInvoiceMail(
                $invoiceData,
                $user,
                $pdfContent,
                $invoice->payment_token
            ));
        
        return redirect()->route('user.invoices')->with('success', 'Invoice resent successfully');
    }

    public function download(GeneralInvoice $invoice)
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
    public function resendAfterEdit(Request $request, GeneralInvoice $invoice)
    {
        // Check if the invoice belongs to the authenticated user
        if ($invoice->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }
        
        try {
            $validated = $request->validate([
                'invoiceData' => 'required|array',
                'pdfBase64' => 'required|string',
                'recipientEmail' => 'required|email',
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
            $newInvoice = GeneralInvoice::create([
                'user_id' => $user->id,
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
                ->send(new SendGeneralInvoiceMail(
                    $invoiceData,
                    $user,
                    $decodedPdf, // Pass the decoded PDF content
                    $newInvoice->payment_token, // Pass the payment token
                    true // Indicate this is an updated invoice
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
    public function edit(GeneralInvoice $invoice)
    {
        // Check if the invoice belongs to the authenticated user
        if ($invoice->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }
        
        // Return the GeneralInvoice page with the invoice data
        return Inertia::render('User/GeneralInvoice', [
            'invoiceData' => $invoice->invoice_data,
            'recipientEmail' => $invoice->client_email,
            'invoiceId' => $invoice->id,
            'isEditing' => true,
        ]);
    }
}
