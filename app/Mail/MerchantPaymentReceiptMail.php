<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\Invoice;
use Illuminate\Mail\Mailables\Content;

class MerchantPaymentReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public $invoice;

    /**
     * Create a new merchant payment receipt email instance.
     * 
     * This email is sent to the merchant (invoice sender) when a payment is received.
     * 
     * @param Invoice $invoice The invoice model containing payment and customer details
     */
    public function __construct(Invoice $invoice)
    {
        $this->invoice = $invoice;
    }

    /**
     * Define the email content and view data.
     * 
     * Prepares the merchant payment receipt content including:
     * - Complete invoice details
     * - Payment confirmation information
     * - Customer payment details
     * - Merchant-specific information
     * 
     * @return \Illuminate\Mail\Mailables\Content
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.compiled.merchant-payment-receipt',
            with: [
                'invoice' => $this->invoice,
                'invoiceData' => $this->invoice->invoice_data
            ]
        );
    }
}
