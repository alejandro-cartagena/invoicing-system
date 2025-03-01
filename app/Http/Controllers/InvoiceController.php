<?php

namespace App\Http\Controllers;

use App\Mail\SendInvoiceMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class InvoiceController extends Controller
{
    public function sendEmail(Request $request)
    {
        $request->validate([
            'recipientEmail' => 'required|email',
            'invoiceData' => 'required|array',
            'pdfBase64' => 'required|string' // We'll send the PDF as base64 from frontend
        ]);

        try {
            // Decode the base64 PDF
            $pdfContent = base64_decode(preg_replace('#^data:application/pdf;base64,#', '', $request->pdfBase64));

            // Send email
            Mail::to($request->recipientEmail)
                ->send(new SendInvoiceMail(
                    invoiceData: $request->invoiceData,
                    sender: auth()->user(),
                    pdfContent: $pdfContent
                ));

            return response()->json([
                'success' => true,
                'message' => 'Invoice sent successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to send invoice: ' . $e->getMessage()
            ], 500);
        }
    }
}
