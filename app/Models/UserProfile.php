<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    protected $fillable = [
        'business_name',
        'address',
        'phone_number',
        'merchant_id',
        'first_name',
        'last_name',
        'public_key',
        'private_key'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    /**
     * Get the invoices associated with this user profile.
     */
    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'user_id', 'user_id');
    }
}
