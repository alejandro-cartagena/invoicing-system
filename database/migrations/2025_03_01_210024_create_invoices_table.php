<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('general_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('invoice_number');
            $table->string('client_name');
            $table->string('client_email');
            $table->decimal('subtotal', 10, 2);
            $table->decimal('tax_rate', 5, 2)->nullable();
            $table->decimal('tax_amount', 10, 2)->nullable();
            $table->decimal('total', 10, 2);
            $table->date('invoice_date');
            $table->date('due_date');
            $table->string('status')->default('sent'); // sent, paid, overdue, cancelled
            $table->string('payment_method')->nullable(); // credit_card, bitcoin, etc.
            $table->json('invoice_data'); // Store the full invoice data as JSON
            $table->string('payment_token')->unique()->nullable(); // For secure payment links
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('general_invoices');
    }
};
