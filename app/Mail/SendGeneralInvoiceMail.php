<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Attachment;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;

class SendGeneralInvoiceMail extends Mailable
{
    use Queueable, SerializesModels;

    protected $invoiceData;
    protected $sender;
    protected $pdfContent;
    protected $paymentToken;
    protected $isUpdated;

    /**
     * Create a new message instance.
     */
    public function __construct($invoiceData, $sender, $pdfContent, $paymentToken = null, $isUpdated = false)
    {
        $this->invoiceData = $invoiceData;
        $this->sender = $sender;
        $this->pdfContent = $pdfContent;
        $this->paymentToken = $paymentToken;
        $this->isUpdated = $isUpdated;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = $this->isUpdated 
            ? 'Updated Invoice from ' . $this->sender->name
            : 'Invoice from ' . $this->sender->name;
            
        return new Envelope(
            subject: $subject,
            replyTo: [
                new Address($this->sender->email, $this->sender->name),
            ]
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        // Generate payment URLs if we have a token
        $creditCardPaymentUrl = null;
        $bitcoinPaymentUrl = null;
        
        if ($this->paymentToken) {
            $creditCardPaymentUrl = URL::signedRoute('general-invoice.pay.credit-card', ['token' => $this->paymentToken]);
            $bitcoinPaymentUrl = URL::signedRoute('general-invoice.pay.bitcoin', ['token' => $this->paymentToken]);
        }
        
        return new Content(
            view: 'emails.invoice',
            with: [
                'senderName' => $this->sender->name,
                'invoiceData' => $this->invoiceData,
                'creditCardPaymentUrl' => $creditCardPaymentUrl,
                'bitcoinPaymentUrl' => $bitcoinPaymentUrl,
                'isUpdated' => $this->isUpdated,
            ]
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        // Create a descriptive filename
        $filename = sprintf(
            'Invoice-%s-%s.pdf',
            preg_replace('/[^a-zA-Z0-9]/', '-', $this->invoiceData['invoiceTitle'] ?? 'General'),
            date('Y-m-d')
        );

        return [
            Attachment::fromData(
                function() {
                    return $this->pdfContent;
                },
                $filename
            )->withMime('application/pdf')
        ];
    }
}
