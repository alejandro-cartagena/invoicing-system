<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'invoice_type',
        'invoice_number',
        'client_name',
        'client_email',
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

    public function userProfile()
    {
        return $this->belongsTo(UserProfile::class, 'user_id', 'user_id');
    }
}
