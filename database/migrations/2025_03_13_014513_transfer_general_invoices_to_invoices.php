<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if both tables exist
        if (Schema::hasTable('general_invoices') && Schema::hasTable('invoices')) {
            // Get all general invoices
            $generalInvoices = DB::table('general_invoices')->get();
            
            // Track the migration progress
            $total = count($generalInvoices);
            $current = 0;
            
            echo "Starting migration of $total invoices...\n";
            
            foreach ($generalInvoices as $invoice) {
                // Insert into the new invoices table
                try {
                    DB::table('invoices')->insert([
                        'id' => $invoice->id,
                        'user_id' => $invoice->user_id,
                        'invoice_type' => 'general',
                        'client_name' => $invoice->client_name,
                        'client_email' => $invoice->client_email,
                        'subtotal' => $invoice->subtotal,
                        'tax_rate' => $invoice->tax_rate ?? 0,
                        'tax_amount' => $invoice->tax_amount ?? 0,
                        'total' => $invoice->total,
                        'invoice_date' => $invoice->invoice_date,
                        'due_date' => $invoice->due_date,
                        'status' => $invoice->status,
                        'payment_method' => $invoice->payment_method,
                        'invoice_data' => $invoice->invoice_data,
                        'payment_token' => $invoice->payment_token,
                        'created_at' => $invoice->created_at,
                        'updated_at' => $invoice->updated_at,
                    ]);
                    
                    $current++;
                    if ($current % 10 === 0 || $current === $total) {
                        echo "Migrated $current of $total invoices...\n";
                    }
                } catch (\Exception $e) {
                    echo "Error migrating invoice ID {$invoice->id}: {$e->getMessage()}\n";
                }
            }
            
            echo "Migration completed. $current of $total invoices migrated successfully.\n";
        } else {
            echo "One or both tables don't exist. Migration skipped.\n";
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration is not reversible
        echo "This migration cannot be reversed.\n";
    }
};
