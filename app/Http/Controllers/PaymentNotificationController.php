<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PaymentNotificationController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->all();
        event(new PaymentNotification($data));
        return response()->json(['message' => 'Payment notification received']);
    }
}
