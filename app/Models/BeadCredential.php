<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

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