<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\DvfWebhookController;
use App\Http\Controllers\BeadCredentialController;
use App\Http\Controllers\PaymentController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Add this route for verifying Bead payment status
Route::post('/bead/verify-payment', [InvoiceController::class, 'verifyBeadPayment']);

// Webhook routes - no CSRF protection by default in API routes
Route::post('/dvf/webhook', [DvfWebhookController::class, 'handle']);
// Route::post('/bead/webhook', [InvoiceController::class, 'handleBeadWebhook']);
Route::post('/', [InvoiceController::class, 'handleBeadWebhook']);

// Test route
Route::get('/test', function() {
    return response()->json(['message' => 'API routes are working!']);
});

// Bead Credentials API Routes
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/bead-credentials/{userId}', [BeadCredentialController::class, 'getCredentials'])
        ->name('api.bead-credentials.get');
});

/*
|--------------------------------------------------------------------------
| Payment Processing API Routes
|--------------------------------------------------------------------------
|
| These routes handle payment processing via API:
| - Processing credit card payments
| - Creating and verifying crypto payments
| - Handling payment webhooks
| All routes require authentication via the auth:sanctum middleware
*/

Route::middleware(['auth:sanctum'])->group(function () {
    // Credit Card Payment Processing
    Route::post('/process-credit-card', [PaymentController::class, 'processCreditCardPayment']);
    
    // Crypto Payment Processing
    Route::post('/create-crypto-payment', [PaymentController::class, 'createCryptoPayment']);
    Route::post('/verify-bead-payment', [PaymentController::class, 'verifyBeadPayment']);
});

// Webhook Routes (no auth required as they're called by external services)
Route::post('/webhooks/bead', [PaymentController::class, 'handleBeadWebhook']); 