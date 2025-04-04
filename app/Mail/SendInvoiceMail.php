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
use App\Models\User;
use App\Models\UserProfile;
class SendInvoiceMail extends Mailable
{
    use Queueable, SerializesModels;

    public $invoiceData;
    public $user;
    public $pdfContent;
    public $paymentToken;
    public $isUpdate;
    public $invoiceType;

    /**
     * Create a new message instance.
     */
    public function __construct($invoiceData, User $user, $pdfContent, $paymentToken, $isUpdate = false, $invoiceType = 'general')
    {
        $this->invoiceData = $invoiceData;
        $this->user = $user;
        $this->pdfContent = $pdfContent;
        $this->paymentToken = $paymentToken;
        $this->isUpdate = $isUpdate;
        $this->invoiceType = $invoiceType;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $businessName = $this->user->profile ? $this->user->profile->business_name : $this->user->name;
        
        // Add logging
        \Log::info('Sending invoice email with:', [
            'from' => 'info@voltms.com',
            'reply_to' => $this->user->email,
            'business_name' => $businessName,
            'user_id' => $this->user->id
        ]);
        
        $subject = $this->isUpdate 
            ? 'UPDATED: Invoice from ' . $businessName
            : 'Invoice from ' . $businessName;
            
        if ($this->invoiceType === 'real_estate') {
            $subject = 'Real Estate ' . $subject;
        }

        return new Envelope(
            from: new Address('info@voltms.com', 'VoltMS'),
            subject: $subject,
            replyTo: [
                new Address($this->user->email, $businessName),
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
        
        $businessName = $this->user->profile ? $this->user->profile->business_name : $this->user->name;
        
        return new Content(
            view: 'emails.invoice',
            with: [
                'senderName' => $businessName,
                'invoiceData' => $this->invoiceData,
                'creditCardPaymentUrl' => $creditCardPaymentUrl,
                'bitcoinPaymentUrl' => $bitcoinPaymentUrl,
                'isUpdated' => $this->isUpdate,
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
