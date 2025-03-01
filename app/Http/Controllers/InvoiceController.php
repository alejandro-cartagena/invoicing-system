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

class InvoiceController extends Controller
{
    public function sendEmail(Request $request)
    {
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
            
            // Save invoice to database
            $invoice = Invoice::create([
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
                ->send(new SendInvoiceMail(
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
            ->get();
            
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
}
