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

    /**
     * The attributes that should be encrypted.
     *
     * @var array
     */
    protected $encrypted = ['private_key'];

    /**
     * Get the encrypted private key.
     *
     * @param  string  $value
     * @return string
     */
    public function getPrivateKeyAttribute($value)
    {
        return $value ? decrypt($value) : null;
    }

    /**
     * Set the encrypted private key.
     *
     * @param  string  $value
     * @return void
     */
    public function setPrivateKeyAttribute($value)
    {
        $this->attributes['private_key'] = $value ? encrypt($value) : null;
    }

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
