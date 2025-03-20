<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use App\Http\Requests\Auth\CreateUserProfileRequest;
use App\Services\NmiService;

class UserProfileController extends Controller
{
    protected $nmiService;

    public function __construct(NmiService $nmiService)
    {
        $this->nmiService = $nmiService;
    }

    public function create()
    {
        return Inertia::render('Admin/CreateUser');
    }

    public function store(CreateUserProfileRequest $request)
    {
        // Double-check that a valid merchant was found using the gateway ID
        $gatewayId = $request->gateway_id;
        $merchantData = $this->nmiService->getMerchantInfo($gatewayId);
        
        if (!$merchantData) {
            return redirect()->back()
                ->withInput()
                ->withErrors(['gateway_id' => 'The provided gateway ID is not valid or the merchant could not be found.']);
        }
        
        // Create the user without generating API keys
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
            'merchant_id' => $request->gateway_id, // Use gateway_id as merchant_id
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            // No keys are generated at this point
        ]);

        return redirect()->route('admin.users.index')
            ->with('message', 'User created successfully');
    }

    /**
     * Generate public and private API keys for a merchant
     *
     * @param string $gatewayId
     * @return array
     */
    public function generateMerchantApiKeys($gatewayId)
    {
        try {
            // Create private key for transactions
            $privateKeyResponse = $this->nmiService->createPrivateApiKey($gatewayId, 'Private Key for Transactions');
            
            // Create public key for tokenization
            $publicKeyResponse = $this->nmiService->createPublicApiKey($gatewayId, 'Public Key for Tokenization');
            
            if ($privateKeyResponse && $publicKeyResponse) {
                // NMI API returns keys in the 'keyText' field, not 'key'
                if (isset($privateKeyResponse['keyText']) && isset($publicKeyResponse['keyText'])) {
                    \Log::info('Successfully generated API keys for merchant', [
                        'gateway_id' => $gatewayId,
                        'private_key_id' => $privateKeyResponse['id'] ?? 'unknown',
                        'public_key_id' => $publicKeyResponse['id'] ?? 'unknown'
                    ]);
                    
                    return [
                        'success' => true,
                        'private_key' => $privateKeyResponse['keyText'],
                        'public_key' => $publicKeyResponse['keyText']
                    ];
                } else {
                    \Log::warning('API keys were generated but keyText field is missing', [
                        'private_key_has_keyText' => isset($privateKeyResponse['keyText']),
                        'public_key_has_keyText' => isset($publicKeyResponse['keyText']),
                        'private_key_fields' => array_keys($privateKeyResponse),
                        'public_key_fields' => array_keys($publicKeyResponse)
                    ]);
                    
                    return [
                        'success' => false,
                        'message' => 'API keys were generated but the keyText field is missing from the response'
                    ];
                }
            } else {
                // Log what failed
                \Log::warning('Failed to generate one or both API keys', [
                    'gateway_id' => $gatewayId,
                    'private_key_created' => !empty($privateKeyResponse),
                    'public_key_created' => !empty($publicKeyResponse)
                ]);
                
                // If we got at least one key, return what we have
                if ($privateKeyResponse || $publicKeyResponse) {
                    return [
                        'success' => true,
                        'private_key' => $privateKeyResponse['keyText'] ?? null,
                        'public_key' => $publicKeyResponse['keyText'] ?? null,
                        'message' => 'Only partial keys were generated'
                    ];
                }
                
                return [
                    'success' => false,
                    'message' => 'Failed to create API keys'
                ];
            }
        } catch (\Exception $e) {
            \Log::error('Error generating merchant API keys: ' . $e->getMessage(), [
                'gateway_id' => $gatewayId,
                'exception' => $e
            ]);
            
            return [
                'success' => false,
                'message' => 'An error occurred while generating API keys: ' . $e->getMessage()
            ];
        }
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
            \Log::info('Fetching merchant info for Gateway ID: ' . $gatewayId);
            
            $merchantData = $this->nmiService->getMerchantInfo($gatewayId);
            
            if ($merchantData) {
                return response()->json([
                    'success' => true,
                    'message' => 'Merchant information fetched successfully',
                    'merchant' => $merchantData
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch merchant information. Please check the Gateway ID and try again.'
                ], 404);
            }
        } catch (\Exception $e) {
            \Log::error('Error fetching merchant info: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while fetching merchant information: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate API keys for a merchant gateway ID and return them
     * 
     * @param string $gatewayId
     * @return \Illuminate\Http\JsonResponse
     */
    public function generateMerchantApiKeysOnly($gatewayId)
    {
        try {
            \Log::info('Attempting to generate API keys for gateway ID: ' . $gatewayId);
            
            // Check if the merchant exists
            $merchantData = $this->nmiService->getMerchantInfo($gatewayId);
            
            if (!$merchantData) {
                \Log::warning('Merchant not found for gateway ID: ' . $gatewayId);
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid Gateway ID or merchant not found'
                ], 404);
            }
            
            // Generate API keys
            $apiKeys = $this->generateMerchantApiKeys($gatewayId);
            
            \Log::info('API key generation result for gateway ID: ' . $gatewayId, [
                'success' => $apiKeys['success'] ?? false,
                'has_public_key' => !empty($apiKeys['public_key']),
                'has_private_key' => !empty($apiKeys['private_key']),
                'message' => $apiKeys['message'] ?? null
            ]);
            
            if ($apiKeys['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'API keys generated successfully',
                    'public_key' => $apiKeys['public_key'] ?? '',
                    'private_key' => $apiKeys['private_key'] ?? ''
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $apiKeys['message'] ?? 'Failed to generate API keys with no specific error'
                ], 400);
            }
        } catch (\Exception $e) {
            \Log::error('Error generating merchant API keys: ' . $e->getMessage(), [
                'gateway_id' => $gatewayId,
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while generating API keys: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate API keys for an existing user
     * 
     * @param User $user
     * @return \Illuminate\Http\RedirectResponse
     */
    public function generateApiKeys(User $user)
    {
        try {
            // Get the gateway ID from the user's profile
            $gatewayId = $user->profile->merchant_id;
            
            if (!$gatewayId) {
                return redirect()->back()
                    ->with('error', 'User does not have a valid merchant ID');
            }
            
            // Check if keys already exist
            if ($user->profile->public_key && $user->profile->private_key) {
                return redirect()->back()
                    ->with('error', 'API keys already exist for this user');
            }
            
            // Generate API keys
            $apiKeys = $this->generateMerchantApiKeys($gatewayId);
            
            if ($apiKeys['success']) {
                // Update the user profile with the new keys
                $user->profile->update([
                    'public_key' => $apiKeys['public_key'],
                    'private_key' => $apiKeys['private_key']
                ]);
                
                return redirect()->back()
                    ->with('message', 'API keys generated successfully');
            } else {
                return redirect()->back()
                    ->with('error', $apiKeys['message']);
            }
        } catch (\Exception $e) {
            \Log::error('Error generating API keys: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'An error occurred while generating API keys: ' . $e->getMessage());
        }
    }
}