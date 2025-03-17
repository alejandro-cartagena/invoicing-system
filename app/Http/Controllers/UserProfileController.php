<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use App\Http\Requests\Auth\CreateUserProfileRequest;

class UserProfileController extends Controller
{
    public function create()
    {
        return Inertia::render('Admin/CreateUser');
    }

    public function store(CreateUserProfileRequest $request)
    {
        $user = User::create([
            'name' => $request->first_name . ' ' . $request->last_name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'usertype' => 'user',
        ]);

        $user->profile()->create([
            'business_name' => $request->business_name,
            'address' => $request->address,
            'phone_number' => $request->phone_number,
            'merchant_id' => $request->merchant_id,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
        ]);

        return redirect()->route('admin.users.index')
            ->with('message', 'User created successfully');
    }

    public function index()
    {
        $users = User::with('profile')
            ->where('usertype', 'user')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'email' => $user->email,
                    'businessName' => $user->profile->business_name,
                    'dateCreated' => $user->created_at->format('Y-m-d'),
                // Add any other fields you need
                ];
            });

        return Inertia::render('Admin/users/ViewUsers', [
            'users' => $users,
        ]);
    }

    public function destroy(User $user)
    {
        try {
            // This will automatically delete the associated profile due to cascade
            $user->delete();

            return redirect()->back()
                ->with('message', 'User deleted successfully');
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Failed to delete user');
        }
    }

    public function edit(User $user)
    {
        $userData = [
            'id' => $user->id,
            'email' => $user->email,
            'business_name' => $user->profile->business_name,
            'address' => $user->profile->address,
            'phone_number' => $user->profile->phone_number,
            'merchant_id' => $user->profile->merchant_id,
            'first_name' => $user->profile->first_name,
            'last_name' => $user->profile->last_name,
        ];

        return Inertia::render('Admin/users/EditUser', [
            'user' => $userData
        ]);
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'email' => ['required', 'email', 'unique:users,email,' . $user->id],
            'business_name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:255'],
            'phone_number' => ['required', 'string', 'size:10', 'regex:/^[0-9]+$/'],
            'merchant_id' => ['required', 'string', 'max:255'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
        ]);

        $user->update([
            'name' => $request->first_name . ' ' . $request->last_name,
            'email' => $request->email,
        ]);

        $user->profile()->update([
            'business_name' => $request->business_name,
            'address' => $request->address,
            'phone_number' => $request->phone_number,
            'merchant_id' => $request->merchant_id,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
        ]);

        return redirect()->route('admin.users.index')
            ->with('message', 'User updated successfully');
    }

    public function fetchMerchantInfo($gatewayId)
    {
        try {
            // For now, just log the request and return a success response
            \Log::info('Fetching merchant info for Gateway ID: ' . $gatewayId);
            
            // In a real implementation, you would make a request to the NMI API
            // using the partner API key stored in your .env file
            
            // For testing, return a mock response
            return response()->json([
                'success' => true,
                'message' => 'Merchant information fetched successfully',
                'gateway_id' => $gatewayId,
                'merchant' => [
                    'company' => 'Test Company',
                    'address1' => '123 Test St',
                    'phone' => '5551234567',
                    'firstName' => 'John',
                    'lastName' => 'Doe',
                    'email' => 'test@example.com',
                    // Add other fields as needed
                ]
            ]);
            
            // When you're ready to implement the actual API call, it would look something like this:
            /*
            $apiKey = env('NMI_PARTNER_API_KEY');
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'Authorization' => $apiKey
            ])->get("https://secure.nmi.com/api/v4/merchants/{$gatewayId}");
            
            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Merchant information fetched successfully',
                    'merchant' => $response->json()
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch merchant information: ' . $response->body()
                ], $response->status());
            }
            */
        } catch (\Exception $e) {
            \Log::error('Error fetching merchant info: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while fetching merchant information: ' . $e->getMessage()
            ], 500);
        }
    }
}