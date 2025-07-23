<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Customer Model
 * 
 * This model represents a customer in the invoicing system and manages customer data:
 * - Complete customer contact and billing information
 * - Relationship with invoices (one customer can have many invoices)
 * - Support for both individual and business customers
 * 
 * Key Features:
 * - Comprehensive contact information storage
 * - Full billing address management
 * - Company/business information
 * - One-to-many relationship with invoices
 * 
 * Relationships:
 * - Has many Invoices
 * - Belongs to a User (merchant who owns this customer)
 * 
 * @property int $id
 * @property int $user_id
 * @property string $email
 * @property string $first_name
 * @property string $last_name
 * @property string|null $company
 * @property string|null $country
 * @property string|null $state
 * @property string|null $address
 * @property string|null $address2
 * @property string|null $city
 * @property string|null $postal_code
 * @property string|null $phone_number
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * 
 * @property-read User $user
 * @property-read \Illuminate\Database\Eloquent\Collection|Invoice[] $invoices
 */
class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'email',
        'first_name',
        'last_name',
        'company',
        'country',
        'state',
        'address',
        'address2',
        'city',
        'postal_code',
        'phone_number',
    ];

    /**
     * Get the user that owns this customer
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all invoices for this customer
     */
    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    /**
     * Get the customer's full name
     */
    public function getFullNameAttribute()
    {
        return trim($this->first_name . ' ' . $this->last_name);
    }

    /**
     * Get the customer's display name (company or full name)
     */
    public function getDisplayNameAttribute()
    {
        return $this->company ?: $this->full_name;
    }

    /**
     * Get the customer's full address as a string
     */
    public function getFullAddressAttribute()
    {
        $address = [];
        
        if ($this->address) $address[] = $this->address;
        if ($this->address2) $address[] = $this->address2;
        if ($this->city) $address[] = $this->city;
        if ($this->state) $address[] = $this->state;
        if ($this->postal_code) $address[] = $this->postal_code;
        if ($this->country) $address[] = $this->country;
        
        return implode(', ', $address);
    }

    /**
     * Scope to search customers by name, email, or company
     */
    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('first_name', 'like', "%{$search}%")
              ->orWhere('last_name', 'like', "%{$search}%")
              ->orWhere('email', 'like', "%{$search}%")
              ->orWhere('company', 'like', "%{$search}%");
        });
    }

    /**
     * Get the total number of invoices for this customer
     */
    public function getTotalInvoicesAttribute()
    {
        return $this->invoices()->count();
    }

    /**
     * Get the total amount billed to this customer
     */
    public function getTotalAmountAttribute()
    {
        return $this->invoices()->sum('total');
    }

    /**
     * Get the total amount paid by this customer
     */
    public function getPaidAmountAttribute()
    {
        return $this->invoices()->where('status', 'paid')->sum('total');
    }

    /**
     * Get the outstanding amount for this customer
     */
    public function getOutstandingAmountAttribute()
    {
        return $this->invoices()->whereIn('status', ['sent', 'overdue'])->sum('total');
    }

    /**
     * Get the overdue amount for this customer
     */
    public function getOverdueAmountAttribute()
    {
        return $this->invoices()->where('status', 'overdue')->sum('total');
    }
} 