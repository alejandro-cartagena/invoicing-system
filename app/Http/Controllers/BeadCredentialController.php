<?php

namespace App\Http\Controllers;

use App\Models\BeadCredential;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Validator;

class BeadCredentialController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'merchant_id' => 'required|string',
            'terminal_id' => 'required|string',
            'username' => 'required|string',
            'password' => 'required|string',
            'status' => 'required|in:manual,pending,approved,rejected',
            'onboarding_url' => 'nullable|url',
            'onboarding_status' => 'required|in:NEEDS_INFO,PENDING_REVIEW,APPROVED,REJECTED'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $credentials = new BeadCredential();
        $credentials->user_id = $request->user_id;
        $credentials->merchant_id = $request->merchant_id;
        $credentials->terminal_id = $request->terminal_id;
        $credentials->username = $request->username;
        $credentials->password = $request->password; // This will be encrypted via the setPasswordAttribute mutator
        $credentials->status = $request->status;
        $credentials->onboarding_url = $request->onboarding_url;
        $credentials->onboarding_status = $request->onboarding_status;
        $credentials->save();

        return response()->json([
            'message' => 'Bead credentials stored successfully',
            'credentials' => $credentials
        ], 201);
    }

    public function getCredentials($userId)
    {
        $credentials = BeadCredential::where('user_id', $userId)->first();

        if (!$credentials) {
            return response()->json(['message' => 'No credentials found for this user'], 404);
        }

        return response()->json([
            'credentials' => [
                'id' => $credentials->id,
                'merchant_id' => $credentials->merchant_id,
                'terminal_id' => $credentials->terminal_id,
                'username' => $credentials->username,
                'password' => $credentials->password, // This will be decrypted via the getPasswordAttribute accessor
                'status' => $credentials->status,
                'onboarding_url' => $credentials->onboarding_url,
                'onboarding_status' => $credentials->onboarding_status
            ]
        ]);
    }

    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'merchant_id' => 'sometimes|required|string',
            'terminal_id' => 'sometimes|required|string',
            'username' => 'sometimes|required|string',
            'password' => 'sometimes|required|string',
            'status' => 'sometimes|required|in:manual,pending,approved,rejected',
            'onboarding_url' => 'nullable|url',
            'onboarding_status' => 'sometimes|required|in:NEEDS_INFO,PENDING_REVIEW,APPROVED,REJECTED'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $credentials = BeadCredential::findOrFail($id);

        if ($request->has('password')) {
            $credentials->password = $request->password;
        }

        $credentials->fill($request->except('password'));
        $credentials->save();

        return response()->json([
            'message' => 'Bead credentials updated successfully',
            'credentials' => $credentials
        ]);
    }
} 