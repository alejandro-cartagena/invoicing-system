<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Invoice Model
 * 
 * This model represents an invoice in the system and handles the complete invoice lifecycle:
 * - Creation and management of invoices (both general and real estate)
 * - Integration with NMI payment gateway for credit card processing
 * - Integration with Bead for cryptocurrency payments
 * - Invoice status tracking (sent, paid, closed, overdue)
 * - Payment token generation and validation
 * 
 * Key Features:
 * - Supports multiple payment methods (credit card via NMI, cryptocurrency via Bead)
 * - Handles both general and real estate invoice types
 * - Tracks payment status and transaction details
 * - Manages invoice lifecycle from creation to payment
 * 
 * Relationships:
 * - Belongs to a User (merchant)
 * - Has payment processing details through NMI and Bead
 * 
 * @property int $id
 * @property int $user_id
 * @property string $client_email
 * @property float $total
 * @property float $subtotal
 * @property float $tax_rate
 * @property float $tax_amount
 * @property string $status
 * @property string $payment_token
 * @property string|null $nmi_invoice_id
 * @property string|null $bead_payment_id
 * @property string|null $bead_payment_url
 * @property string $invoice_type
 * @property array $invoice_data
 * @property \Carbon\Carbon $invoice_date
 * @property \Carbon\Carbon $due_date
 * @property \Carbon\Carbon|null $payment_date
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * 
 * @property-read User $user
 * @property-read UserProfile $userProfile
 */

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'customer_id',
        'invoice_type',
        'company_name',
        'client_email',
        'first_name',
        'last_name',
        'country',
        'city',
        'state',
        'zip',
        'subtotal',
        'tax_rate',
        'tax_amount',
        'total',
        'invoice_date',
        'due_date',
        'status',
        'payment_method',
        'invoice_data',
        'payment_token',
        // Real estate specific fields
        'property_address',
        'title_number',
        'buyer_name',
        'seller_name',
        'agent_name',
        // Payment specific fields
        'payment_date',
        'transaction_id',
        'nmi_invoice_id',
        // Add this field for Bead payments
        'bead_payment_id',
        'bead_payment_url'
    ];

    protected $casts = [
        'invoice_data' => 'array',
        'invoice_date' => 'date',
        'due_date' => 'date',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    // Scope to get only general invoices
    public function scopeGeneral($query)
    {
        return $query->where('invoice_type', 'general');
    }
    
    // Scope to get only real estate invoices
    public function scopeRealEstate($query)
    {
        return $query->where('invoice_type', 'real_estate');
    }
    
    // Determine if this is a real estate invoice
    public function isRealEstate()
    {
        return $this->invoice_type === 'real_estate';
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function userProfile()
    {
        return $this->belongsTo(UserProfile::class, 'user_id', 'user_id');
    }
}
