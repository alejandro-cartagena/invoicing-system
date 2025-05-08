<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\UserProfile;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Get all user profiles with unencrypted private keys
        $profiles = UserProfile::whereNotNull('private_key')->get();
        
        foreach ($profiles as $profile) {
            // The private_key will be automatically encrypted when saved
            $profile->save();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Note: We can't safely decrypt the keys in the down method
        // as we don't know which keys were originally encrypted
    }
}; 