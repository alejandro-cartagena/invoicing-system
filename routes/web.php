<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\HomeController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserProfileController;
use Inertia\Inertia;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\DvfWebhookController;
use App\Http\Controllers\BeadCredentialController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PaymentNotificationController;

/*
|--------------------------------------------------------------------------
| Public and Authenticated User Routes
|--------------------------------------------------------------------------
|
| These routes handle the main application flow:
| - Guest users are directed to the login page at the root URL
| - Admin users can access their dashboard at /admin/dashboard 
| - Authenticated users can access their dashboard and invoice creation pages
| All routes use Inertia.js for rendering the frontend components
*/

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

Route::get('create-invoices', function () {
    return Inertia::render('User/CreateInvoices');
})->middleware(['auth', 'verified'])->name('user.create-invoices');

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

    // Add route for getting Bead credentials
    Route::get('/admin/users/{user}/bead-credentials', [BeadCredentialController::class, 'getCredentials'])
        ->middleware(['auth', 'admin'])
        ->name('admin.users.bead-credentials');

    // Add route for storing Bead credentials
    Route::post('/admin/bead-credentials', [BeadCredentialController::class, 'store'])
        ->name('admin.bead-credentials.store');

    // Add route for updating Bead credentials
    Route::put('/admin/bead-credentials/{id}', [BeadCredentialController::class, 'update'])
        ->name('admin.bead-credentials.update');
});


/*
|--------------------------------------------------------------------------
| Authentication and Profile Routes
|--------------------------------------------------------------------------
|
| These routes handle user profile management and authentication:
| - Authenticated users can edit, update and delete their profiles
| - Users can manage their Bead payment credentials
| All routes require authentication via the auth middleware
*/

Route::middleware(['auth'])->group(function () {
    // Profile Management
    Route::get('profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Bead Credentials Management
    Route::put('/bead-credentials/{id}', [BeadCredentialController::class, 'update'])->name('bead-credentials.update');
});


/*
|--------------------------------------------------------------------------
| Invoice Management Routes
|--------------------------------------------------------------------------
|
| These routes handle invoice operations for authenticated users:
| - Viewing and downloading invoices
| - Creating and sending new invoices
| - Editing existing invoices
| - Invoice actions like closing and resending
| All routes require authentication via the auth middleware
*/

Route::middleware(['auth'])->group(function () {
    // Invoice Listing and Viewing
    Route::get('/invoices', [InvoiceController::class, 'index'])->name('user.invoices');
    Route::get('/invoice/view/{invoice}', [InvoiceController::class, 'show'])->name('user.invoice.view');
    Route::get('/invoice/download/{invoice}', [InvoiceController::class, 'download'])->name('user.invoice.download');

    // Invoice Creation and Sending
    Route::post('/invoice/send-invoice', [InvoiceController::class, 'sendInvoice'])
        ->middleware(['verified'])
        ->name('invoice.send-invoice');

    // Invoice Editing
    Route::get('/general-invoice/edit/{invoice}', [InvoiceController::class, 'edit'])->name('user.general-invoice.edit');
    Route::get('/real-estate-invoice/edit/{invoice}', [InvoiceController::class, 'edit'])->name('user.real-estate-invoice.edit');
    Route::post('/invoice/{invoice}/resend-after-edit', [InvoiceController::class, 'resendAfterEdit'])->name('user.invoice.resend-after-edit');
    Route::post('/invoice/{invoice}/replace', [InvoiceController::class, 'replaceInvoice'])
        ->middleware(['verified'])
        ->name('invoice.replace');

    // Invoice Actions
    Route::delete('/invoice/{invoice}', [InvoiceController::class, 'destroy'])->name('user.invoice.destroy');
    Route::post('/invoice/{invoice}/resend', [InvoiceController::class, 'resendInvoice'])->name('user.invoice.resend');
    Route::post('/invoice/{invoice}/close', [InvoiceController::class, 'closeInvoice'])->name('user.invoice.close');
});


/*
|--------------------------------------------------------------------------
| Payment Processing Routes
|--------------------------------------------------------------------------
|
| These routes handle payment processing for authenticated users:
| - Creating crypto and credit card payments
| - Verifying payment status
| All routes require authentication via the auth middleware
*/

Route::middleware(['auth'])->group(function () {
    // Payment Creation
    Route::post('/invoice/create-crypto-payment', [PaymentController::class, 'createCryptoPayment'])->name('invoice.create.crypto-payment');
    Route::post('/invoice/process-credit-card', [PaymentController::class, 'processCreditCardPayment'])->name('invoice.process.credit-card');
    
    // Payment Status Verification
    Route::get('/verify-bead-payment-status', [PaymentController::class, 'getBeadPaymentStatus'])->name('verify.bead.payment.status');
});


/*
|--------------------------------------------------------------------------
| Public Payment Routes
|--------------------------------------------------------------------------
|
| These routes handle payment processing for invoice recipients:
| - Credit card payments via NMI gateway
| - Bitcoin payments via Bead integration
| Routes are accessed via secure tokens sent in invoice emails
*/

Route::get('/invoice/pay/{token}/credit-card', [PaymentController::class, 'showCreditCardPayment'])->name('invoice.pay.credit-card');
Route::get('/invoice/pay/{token}/bitcoin', [PaymentController::class, 'showBitcoinPayment'])->name('invoice.pay.bitcoin');



/*
|--------------------------------------------------------------------------
| Payment Success and Notification Routes
|--------------------------------------------------------------------------
|
| These routes handle payment success pages and notifications:
| - Payment success page for completed transactions
| - Payment notification handling
| - DVF webhook processing
| Routes are accessed after payment completion or by payment providers
*/

// Payment success page
Route::get('/payment-success', function () {
    return Inertia::render('Payment/PaymentSuccess');
})->name('payment.success');

// Payment notification handling
Route::post('/payment-notification', [PaymentNotificationController::class, 'store'])
    ->name('payment.notification');

// DVF webhook processing
Route::post('/dvf/webhook', [DvfWebhookController::class, 'handle'])
    ->name('dvf.webhook');

// Add this route for getting invoice by NMI invoice ID
Route::get('/invoice/nmi/{nmiInvoiceId}', [InvoiceController::class, 'getByNmiInvoiceId'])
    ->name('user.invoice.get-by-nmi-id');
    

/*
|--------------------------------------------------------------------------
| Testing Routes
|--------------------------------------------------------------------------
|
| These routes are used for testing Bead API integration:
| - Testing authentication with Bead API
| - Checking API status and connectivity
| Routes require authentication via auth middleware
*/

Route::middleware(['auth'])->group(function () {
    Route::get('/test-bead-auth', [PaymentController::class, 'testBeadAuth'])
        ->name('test.bead.auth');

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
});


require __DIR__.'/auth.php';

