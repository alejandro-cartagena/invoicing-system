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

    public function __construct(Invoice $invoice)
    {
        $this->invoice = $invoice;
    }

    public function build()
    {
        return $this->view('emails.compiled.payment-receipt')
                    ->with([
                        'invoice' => $this->invoice,
                    ]);
    }

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