<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // Add the new columns
            $table->string('first_name')->nullable()->after('invoice_type');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('country')->nullable()->after('last_name');
            $table->string('city')->nullable()->after('country');
            $table->string('state')->nullable()->after('city');
            $table->string('zip')->nullable()->after('state');
        });

        // Do the data migration in a separate step AFTER the columns are created
        DB::statement("UPDATE invoices SET first_name = client_name WHERE first_name IS NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'first_name',
                'last_name',
                'country',
                'city',
                'state',
                'zip'
            ]);
        });
    }
};
