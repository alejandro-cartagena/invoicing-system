<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GeneralInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
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
    ];

    protected $casts = [
        'invoice_data' => 'array',
        'invoice_date' => 'date',
        'due_date' => 'date',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
