<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\HomeController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserProfileController;
use Inertia\Inertia;
use App\Http\Controllers\InvoiceController;


Route::get('/', function () {
    return Inertia::render('Auth/Login', [
        'canResetPassword' => Route::has('password.request'),
        'status' => session('status'),
    ]);
})->middleware('guest')->name('welcome');


Route::get('/admin/dashboard', function () {
    return Inertia::render('Admin/Dashboard');
})->middleware(['auth', 'verified', 'admin'])->name('admin.dashboard');


Route::get('dashboard', function () {
    return Inertia::render('User/Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');


Route::get('/general-invoice', function () {
    return Inertia::render('User/GeneralInvoice');
})->middleware(['auth', 'verified'])->name('user.general-invoice');


Route::middleware(['auth', 'admin'])->group(function () {
    Route::get('/admin/profile', [ProfileController::class, 'edit'])->name('admin.profile.edit');
    Route::patch('/admin/profile', [ProfileController::class, 'update'])->name('admin.profile.update');
    Route::delete('/admin/profile', [ProfileController::class, 'destroy'])->name('admin.profile.destroy');

    Route::get('/admin/create', [UserProfileController::class, 'create'])->name('admin.create');
    Route::post('/admin/users', [UserProfileController::class, 'store'])->name('admin.users.store');
    Route::get('/admin/users', [UserProfileController::class, 'index'])->name('admin.users.index');
    Route::delete('/admin/users/{user}', [UserProfileController::class, 'destroy'])->name('admin.users.destroy');
    Route::get('/admin/users/{user}/edit', [UserProfileController::class, 'edit'])->name('admin.users.edit');
    Route::patch('/admin/users/{user}', [UserProfileController::class, 'update'])->name('admin.users.update');
});


Route::middleware(['auth'])->group(function () {
    Route::get('profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});


Route::post('/invoice/send-email', [InvoiceController::class, 'sendEmail'])
    ->middleware(['auth'])
    ->name('invoice.send-email');


require __DIR__.'/auth.php';

