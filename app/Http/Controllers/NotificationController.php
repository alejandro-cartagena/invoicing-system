<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\User;
use App\Mail\SendInvoiceMail;
use App\Mail\PaymentReceiptMail;
use App\Mail\MerchantPaymentReceiptMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    /**
     * Send an invoice to a customer
     * 
     * This method handles sending invoice emails to customers, including:
     * - Sending the invoice PDF
     * - Including payment options (credit card and cryptocurrency)
     * - Handling both new and edited invoices
     * 
     * @param array $invoiceData The invoice data to be sent
     * @param User $user The merchant/user sending the invoice
     * @param string $pdfContent The PDF content as a string
     * @param string $paymentToken The unique payment token for the invoice
     * @param bool $isEdited Whether this is a resend of an edited invoice
     * @param string $invoiceType The type of invoice (general or real_estate)
     * @param string $recipientEmail The email address of the recipient
     * @return bool Whether the email was sent successfully
     */
    public function sendInvoiceEmail(
        array $invoiceData,
        User $user,
        string $pdfContent,
        string $paymentToken,
        bool $isEdited = false,
        string $invoiceType = 'general',
        string $recipientEmail = null
    ) {
        try {
            // Use provided recipient email or get from invoice data
            $to = $recipientEmail ?? $invoiceData['client_email'] ?? null;
            
            if (!$to) {
                throw new \Exception('No recipient email address provided');
            }

            // Send the email
            Mail::to($to)->send(new SendInvoiceMail(
                $invoiceData,
                $user,
                $pdfContent,
                $paymentToken,
                $isEdited,
                $invoiceType
            ));

            Log::info('Invoice email sent successfully', [
                'recipient' => $to,
                'invoice_type' => $invoiceType,
                'is_edited' => $isEdited
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to send invoice email: ' . $e->getMessage(), [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'recipient' => $to ?? 'unknown',
                'invoice_type' => $invoiceType
            ]);

            return false;
        }
    }

    /**
     * Send payment receipt to customer
     * 
     * This method sends a payment confirmation email to the customer
     * after a successful payment.
     * 
     * @param Invoice $invoice The paid invoice
     * @return bool Whether the email was sent successfully
     */
    public function sendPaymentReceipt(Invoice $invoice)
    {
        try {
            Mail::to($invoice->client_email)->send(new PaymentReceiptMail($invoice));

            Log::info('Payment receipt sent to customer', [
                'invoice_id' => $invoice->id,
                'recipient' => $invoice->client_email
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to send payment receipt: ' . $e->getMessage(), [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'invoice_id' => $invoice->id,
                'recipient' => $invoice->client_email
            ]);

            return false;
        }
    }

    /**
     * Send payment notification to merchant
     * 
     * This method sends a payment notification email to the merchant
     * after a successful payment.
     * 
     * @param Invoice $invoice The paid invoice
     * @return bool Whether the email was sent successfully
     */
    public function sendMerchantPaymentNotification(Invoice $invoice)
    {
        try {
            Mail::to($invoice->user->email)->send(new MerchantPaymentReceiptMail($invoice));

            Log::info('Payment notification sent to merchant', [
                'invoice_id' => $invoice->id,
                'merchant_email' => $invoice->user->email
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to send merchant payment notification: ' . $e->getMessage(), [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'invoice_id' => $invoice->id,
                'merchant_email' => $invoice->user->email
            ]);

            return false;
        }
    }

    /**
     * Send payment notifications
     * 
     * This method sends both customer receipt and merchant notification
     * after a successful payment.
     * 
     * @param Invoice $invoice The paid invoice
     * @return array Status of both email notifications
     */
    public function sendPaymentNotifications(Invoice $invoice)
    {
        $customerReceiptSent = $this->sendPaymentReceipt($invoice);
        $merchantNotificationSent = $this->sendMerchantPaymentNotification($invoice);

        return [
            'customer_receipt_sent' => $customerReceiptSent,
            'merchant_notification_sent' => $merchantNotificationSent
        ];
    }
} 