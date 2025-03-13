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

Route::get('/real-estate-invoice', function () {
    return Inertia::render('User/RealEstateInvoice');
})->middleware(['auth', 'verified'])->name('user.real-estate-invoice');


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

// Send general invoice email
Route::post('/invoice/send-email', [InvoiceController::class, 'sendEmail'])
    ->middleware(['auth'])
    ->name('user.invoice.send-email');




// Payment routes (these will be accessed via email links)
Route::get('/general-invoice/pay/{token}/credit-card', [InvoiceController::class, 'showCreditCardPayment'])
    ->name('general-invoice.pay.credit-card');
    
Route::get('/general-invoice/pay/{token}/bitcoin', [InvoiceController::class, 'showBitcoinPayment'])
    ->name('general-invoice.pay.bitcoin');

// Payment processing routes
Route::post('/general-invoice/process-credit-card', [InvoiceController::class, 'processCreditCardPayment'])
    ->name('general-invoice.process.credit-card');
    
Route::post('/general-invoice/process-bitcoin', [InvoiceController::class, 'processBitcoinPayment'])
    ->name('general-invoice.process.bitcoin');

// Invoice listing page
Route::get('/invoices', [InvoiceController::class, 'index'])
    ->middleware(['auth'])
    ->name('user.invoices');

// Add these routes for invoice actions
Route::delete('/invoice/{invoice}', [InvoiceController::class, 'destroy'])
    ->middleware(['auth'])
    ->name('user.invoice.destroy');

Route::post('/invoice/{invoice}/resend', [InvoiceController::class, 'resend'])
    ->middleware(['auth'])
    ->name('user.invoice.resend');

Route::get('/invoice/download/{invoice}', [InvoiceController::class, 'download'])
    ->middleware(['auth'])
    ->name('user.invoice.download');

// Add this new route for resending after edit
Route::post('/invoice/{invoice}/resend-after-edit', [InvoiceController::class, 'resendAfterEdit'])
    ->middleware(['auth'])
    ->name('user.invoice.resend-after-edit');

// Add this route for editing a general invoice
Route::get('/general-invoice/edit/{invoice}', [InvoiceController::class, 'edit'])
    ->middleware(['auth'])
    ->name('user.general-invoice.edit');

// Add this route for editing a real estate invoice
Route::get('/real-estate-invoice/edit/{invoice}', [InvoiceController::class, 'edit'])
    ->middleware(['auth'])
    ->name('user.real-estate-invoice.edit');

require __DIR__.'/auth.php';

