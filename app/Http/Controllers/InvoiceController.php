<?php

namespace App\Http\Controllers;

use App\Mail\SendInvoiceMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

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

            // Send the email with the PDF attachment
            Mail::to($validated['recipientEmail'])
                ->send(new SendInvoiceMail(
                    $validated['invoiceData'],
                    $user,
                    $decodedPdf // Pass the decoded PDF content
                ));

            return response()->json([
                'success' => true,
                'message' => 'Invoice sent successfully'
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
}
