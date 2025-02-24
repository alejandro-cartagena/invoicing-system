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
        'last_name'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
