<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\HomeController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserProfileController;
use Inertia\Inertia;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\DvfWebhookController;

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
    Route::get('/admin/users/{user}/view', [UserProfileController::class, 'view'])->name('admin.users.view');
    Route::patch('/admin/users/{user}', [UserProfileController::class, 'update'])->name('admin.users.update');

    // Add this route for fetching merchant information
    Route::get('/admin/fetch-merchant-info/{gateway_id}', [UserProfileController::class, 'fetchMerchantInfo'])
        ->middleware(['auth', 'admin'])
        ->name('admin.fetch-merchant-info');

    // Add this route to check if a merchant ID already exists
    Route::get('/admin/check-merchant-exists/{merchant_id}', [UserProfileController::class, 'checkMerchantExists'])
        ->middleware(['auth', 'admin'])
        ->name('admin.check-merchant-exists');

    // Add this new route for generating API keys
    Route::post('/admin/users/{user}/generate-api-keys', [UserProfileController::class, 'generateApiKeys'])
        ->name('admin.users.generate-api-keys');

    // Add this new route for generating merchant API keys directly
    Route::post('/admin/generate-merchant-api-keys/{gateway_id}', [UserProfileController::class, 'generateMerchantApiKeysOnly'])
        ->middleware(['auth', 'admin'])
        ->name('admin.generate-merchant-api-keys');
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

// Route for sending invoice to NMI merchant portal
Route::post('/invoice/send-to-nmi', [InvoiceController::class, 'sendInvoiceToNmi'])
    ->middleware(['auth', 'verified'])
    ->name('invoice.send-to-nmi');

// Payment routes (these will be accessed via email links)
Route::get('/general-invoice/pay/{token}/credit-card', [InvoiceController::class, 'showCreditCardPayment'])
    ->name('general-invoice.pay.credit-card');
    
Route::get('/general-invoice/pay/{token}/bitcoin', [InvoiceController::class, 'showBitcoinPayment'])
    ->name('general-invoice.pay.bitcoin');

// Payment processing routes
Route::post('/general-invoice/process-credit-card', [InvoiceController::class, 'processCreditCardPayment'])
    ->name('general-invoice.process.credit-card');
    
Route::post('/invoice/create-crypto-payment', [InvoiceController::class, 'createCryptoPayment'])
    ->name('invoice.create.crypto-payment');

Route::get('/verify-bead-payment-status', [InvoiceController::class, 'getBeadPaymentStatus'])
    ->name('verify.bead.payment.status');

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

// Add this route for updating an invoice in NMI
Route::post('/invoice/{invoice}/update-in-nmi', [InvoiceController::class, 'updateInvoiceInNmi'])
    ->middleware(['auth', 'verified'])
    ->name('invoice.update-in-nmi');

// Add this route for closing invoices
Route::post('/invoice/{invoice}/close', [InvoiceController::class, 'closeInvoice'])
    ->middleware(['auth'])
    ->name('user.invoice.close');

// Add this route for viewing invoice details
Route::get('/invoice/view/{invoice}', [InvoiceController::class, 'show'])
    ->middleware(['auth'])
    ->name('user.invoice.view');

// Add this route for testing Bead API authentication
Route::get('/test-bead-auth', [InvoiceController::class, 'testBeadAuth'])
    ->middleware(['auth'])
    ->name('test.bead.auth');

// Add this route for testing Bead API
Route::get('/test-bead-api-status', function () {
    try {
        $beadService = new App\Services\BeadPaymentService();
        $token = $beadService->getAccessToken();
        
        return response()->json([
            'status' => 'success',
            'message' => 'Successfully authenticated with Bead API',
            'token_length' => strlen($token),
            'terminal_id' => $beadService->getTerminalId()
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage()
        ], 500);
    }
})->name('test.bead.api');

// Add this route for Bead payment success
Route::get('/payment-success', function () {
    return Inertia::render('Payment/PaymentSuccess');
})->name('payment.success');

Route::post('/payment-notification', [PaymentNotificationController::class, 'store'])
    ->name('payment.notification');

// Add this route for getting invoice by NMI invoice ID
Route::get('/invoice/nmi/{nmiInvoiceId}', [InvoiceController::class, 'getByNmiInvoiceId'])
    ->name('user.invoice.get-by-nmi-id');
    
require __DIR__.'/auth.php';

