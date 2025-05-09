<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * UserProfile Model
 * 
 * This model represents a merchant's business profile and payment gateway configuration.
 * It stores essential business information and secure payment gateway credentials.
 * 
 * Key Features:
 * - Stores business contact and identification information
 * - Manages secure payment gateway credentials (NMI)
 * - Handles encryption of sensitive data (private keys)
 * - Links business profiles to users and their invoices
 * 
 * Security:
 * - Private keys are automatically encrypted/decrypted
 * - Sensitive data is protected through Laravel's encryption
 * 
 * Relationships:
 * - Belongs to a User
 * - Has many Invoices
 * 
 * @property int $id
 * @property int $user_id
 * @property string $business_name
 * @property string $address
 * @property string $phone_number
 * @property string $merchant_id
 * @property string $first_name
 * @property string $last_name
 * @property string $public_key
 * @property string $private_key
 * @property string $gateway_id
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * 
 * @property-read User $user
 * @property-read \Illuminate\Database\Eloquent\Collection|Invoice[] $invoices
 */

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
        'private_key',
        'gateway_id'
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
