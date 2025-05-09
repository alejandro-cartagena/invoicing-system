<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PaymentNotificationController extends Controller
{
    /**
     * Store a new payment notification
     * 
     * Receives payment notification data from webhook requests and broadcasts
     * it as an event for processing by event listeners. Returns a JSON
     * response confirming receipt of the notification.
     *
     * @param Request $request The incoming webhook request containing payment data
     * @return \Illuminate\Http\JsonResponse JSON response indicating success
     */
    public function store(Request $request)
    {
        $data = $request->all();
        event(new PaymentNotification($data));
        return response()->json(['message' => 'Payment notification received']);
    }
}
