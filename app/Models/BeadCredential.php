<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

/**
 * BeadCredential Model
 * 
 * This model manages the cryptocurrency payment gateway (Bead) credentials for merchants.
 * It handles secure storage and access to Bead API credentials and tracks the onboarding status
 * of merchants in the Bead payment system.
 * 
 * Key Features:
 * - Secure storage of Bead API credentials (encrypted)
 * - Merchant and terminal identification management
 * - Onboarding status tracking
 * - Automatic encryption/decryption of sensitive data
 * 
 * Security:
 * - Passwords are automatically encrypted using Laravel's Crypt facade
 * - Sensitive credentials are never stored in plain text
 * 
 * Relationships:
 * - Belongs to a User (merchant)
 * 
 * @property int $id
 * @property int $user_id
 * @property string $merchant_id
 * @property string $terminal_id
 * @property string $username
 * @property string $password_encrypted
 * @property string $status
 * @property string $onboarding_url
 * @property string $onboarding_status
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * 
 * @property-read User $user
 * @property-read string $password
 */

class BeadCredential extends Model
{
    protected $fillable = [
        'user_id',
        'merchant_id',
        'terminal_id',
        'username',
        'password_encrypted',
        'status',
        'onboarding_url',
        'onboarding_status'
    ];

    protected $casts = [
        'status' => 'string',
        'onboarding_status' => 'string'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getPasswordAttribute()
    {
        return Crypt::decrypt($this->password_encrypted);
    }

    public function setPasswordAttribute($value)
    {
        $this->attributes['password_encrypted'] = Crypt::encrypt($value);
    }
} 