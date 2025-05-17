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
Route::post('/bead/verify-payment', [PaymentController::class, 'verifyBeadPayment']);

// Webhook routes - no CSRF protection by default in API routes
Route::post('/dvf/webhook', [DvfWebhookController::class, 'handle']);
Route::post('/bead/webhook', [InvoiceController::class, 'handleBeadWebhook']);
// Route::post('/', [PaymentController::class, 'handleBeadWebhook']);

// Test route
Route::get('/test', function() {
    return response()->json(['message' => 'API routes are working!']);
});
