<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Admin',
            'email' => 'info@voltms.com',
            'password' => Hash::make(env('ADMIN_SEED_PASSWORD', Str::random(16))),
            'usertype' => 'admin',
        ]);
    }
}
