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
use App\Models\BeadCredential;

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
     * Create a new invoice email instance.
     * 
     * @param array $invoiceData The invoice data including product lines, tax rate, etc.
     * @param User $user The merchant/user sending the invoice
     * @param string $pdfContent The generated PDF content of the invoice
     * @param string $paymentToken Unique token for secure payment URL generation
     * @param bool $isUpdate Whether this is an updated invoice (default: false)
     * @param string $invoiceType Type of invoice ('general' or 'real_estate', default: 'general')
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
     * Configure the email envelope (sender, subject, reply-to).
     * 
     * Sets up the email metadata including:
     * - From address (system email)
     * - Subject line (includes business name and update status)
     * - Reply-to address (merchant's email)
     * 
     * @return \Illuminate\Mail\Mailables\Envelope
     */
    public function envelope(): Envelope
    {
        $businessName = $this->user->profile ? $this->user->profile->business_name : $this->user->name;
        
        // Add logging
        \Log::info('Sending invoice email with:', [
            'from' => config('mail.from.address'),
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
            from: new Address(config('mail.from.address'), config('mail.from.name')),
            subject: $subject,
            replyTo: [
                new Address($this->user->email, $businessName),
            ]
        );
    }

    /**
     * Define the email content and view data.
     * 
     * Prepares the email content including:
     * - Generates secure payment URLs for credit card and Bitcoin
     * - Calculates invoice totals (subtotal, tax, total)
     * - Passes all necessary data to the email template
     * 
     * @return \Illuminate\Mail\Mailables\Content
     */
    public function content(): Content
    {
        // Generate payment URLs if we have a token
        $creditCardPaymentUrl = null;
        $bitcoinPaymentUrl = null;
        
        if ($this->paymentToken) {
            $creditCardPaymentUrl = URL::signedRoute('invoice.pay.credit-card', ['token' => $this->paymentToken]);
            
            // Only generate Bitcoin payment URL if user has Bead credentials
            $hasBeadCredentials = BeadCredential::where('user_id', $this->user->id)->exists();
            if ($hasBeadCredentials) {
                $bitcoinPaymentUrl = URL::signedRoute('invoice.pay.bitcoin', ['token' => $this->paymentToken]);
            }
        }
        
        $businessName = $this->user->profile ? $this->user->profile->business_name : $this->user->name;

        // Calculate totals
        $subTotal = 0;
        $taxRate = $this->invoiceData['taxRate'] ?? 0;
        
        if (isset($this->invoiceData['productLines']) && is_array($this->invoiceData['productLines'])) {
            foreach ($this->invoiceData['productLines'] as $item) {
                if (isset($item['quantity']) && isset($item['rate'])) {
                    $subTotal += ($item['quantity'] * $item['rate']);
                }
            }
        }
        
        $tax = $subTotal * ($taxRate / 100);
        $total = $subTotal + $tax;
        
        return new Content(
            view: 'emails.minified.invoice',
            with: [
                'senderName' => $businessName,
                'invoiceData' => $this->invoiceData,
                'creditCardPaymentUrl' => $creditCardPaymentUrl,
                'bitcoinPaymentUrl' => $bitcoinPaymentUrl,
                'isUpdated' => $this->isUpdate,
                'subTotal' => $subTotal,
                'taxRate' => $taxRate,
                'tax' => $tax,
                'total' => $total,
            ]
        );
    }

    /**
     * Define the email attachments.
     * 
     * Attaches the invoice PDF with a formatted filename that includes:
     * - Invoice title (sanitized)
     * - Current date
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
