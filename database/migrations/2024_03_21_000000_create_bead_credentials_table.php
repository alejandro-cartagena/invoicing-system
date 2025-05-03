<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('bead_credentials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('merchant_id');
            $table->string('terminal_id');
            $table->string('username');
            $table->text('password_encrypted');
            $table->enum('status', ['manual', 'pending', 'approved', 'rejected'])->default('manual');
            $table->text('onboarding_url')->nullable();
            $table->enum('onboarding_status', ['NEEDS_INFO', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'])->default('NEEDS_INFO');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('bead_credentials');
    }
}; 