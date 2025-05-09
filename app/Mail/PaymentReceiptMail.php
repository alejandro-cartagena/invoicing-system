<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\Invoice;
use Illuminate\Mail\Mailables\Content;

class PaymentReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public $invoice;

    /**
     * Create a new payment receipt email instance.
     * 
     * @param Invoice $invoice The invoice model containing payment and customer details
     */
    public function __construct(Invoice $invoice)
    {
        $this->invoice = $invoice;
    }

    /**
     * Build the payment receipt email.
     * 
     * This method is used for backward compatibility with older Laravel versions.
     * It sets up the email view and passes the invoice data to the template.
     * 
     * @return \Illuminate\Mail\Mailable
     */
    public function build()
    {
        return $this->view('emails.compiled.payment-receipt')
                    ->with([
                        'invoice' => $this->invoice,
                    ]);
    }

    /**
     * Define the email content and view data.
     * 
     * Prepares the payment receipt content including:
     * - Complete invoice details
     * - Payment information
     * - Customer details
     * 
     * @return \Illuminate\Mail\Mailables\Content
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.compiled.payment-receipt',
            with: [
                'invoice' => $this->invoice,
                'invoiceData' => $this->invoice->invoice_data
            ]
        );
    }
}