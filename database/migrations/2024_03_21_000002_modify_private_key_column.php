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
        if (!Schema::hasColumn('user_profiles', 'private_key_new')) {
            Schema::table('user_profiles', function (Blueprint $table) {
                // Add new column
                $table->text('private_key_new')->nullable()->after('public_key');
            });

            // Copy data from old column to new column
            DB::statement('UPDATE user_profiles SET private_key_new = private_key');

            Schema::table('user_profiles', function (Blueprint $table) {
                // Drop old column
                $table->dropColumn('private_key');
            });

            Schema::table('user_profiles', function (Blueprint $table) {
                // Rename new column to original name
                $table->renameColumn('private_key_new', 'private_key');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasColumn('user_profiles', 'private_key_old')) {
            Schema::table('user_profiles', function (Blueprint $table) {
                // Add temporary column at the end (using TEXT to prevent truncation)
                $table->text('private_key_old')->nullable();
            });

            // Copy data back
            DB::statement('UPDATE user_profiles SET private_key_old = private_key');

            Schema::table('user_profiles', function (Blueprint $table) {
                // Drop the text column
                $table->dropColumn('private_key');
            });

            Schema::table('user_profiles', function (Blueprint $table) {
                // Rename back to original
                $table->renameColumn('private_key_old', 'private_key');
            });
        }
    }
}; 