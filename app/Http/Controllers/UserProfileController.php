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
            // First, check if the merchant already has API keys
            $existingKeys = $this->nmiService->checkExistingApiKeys($gatewayId);
            
            // Make sure keys are properly initialized to avoid undefined array key issues
            $publicKey = isset($existingKeys['public_key']) ? $existingKeys['public_key'] : null;
            $privateKey = isset($existingKeys['private_key']) ? $existingKeys['private_key'] : null;
            $keysExist = isset($existingKeys['keys_exist']) ? $existingKeys['keys_exist'] : false;
            
            // If keys already exist, return them instead of creating new ones
            if ($keysExist) {
                \Log::info('Using existing API keys for merchant', [
                    'gateway_id' => $gatewayId
                ]);
                
                return [
                    'success' => true,
                    'private_key' => $privateKey,
                    'public_key' => $publicKey,
                    'message' => 'Retrieved existing API keys'
                ];
            }
            
            \Log::info('Starting sequential key generation for merchant', [
                'gateway_id' => $gatewayId,
                'has_existing_public_key' => !empty($publicKey),
                'has_existing_private_key' => !empty($privateKey)
            ]);
            
            // IMPORTANT: Create keys one at a time with a check in between to avoid duplicates
            
            // Step 1: Create private key if needed
            if (!$privateKey) {
                \Log::info('Creating private key for merchant', ['gateway_id' => $gatewayId]);
                // Create private key for transactions
                $privateKeyResponse = $this->nmiService->createPrivateApiKey($gatewayId, 'Private Key for Transactions');
                if ($privateKeyResponse && isset($privateKeyResponse['keyText'])) {
                    $privateKey = $privateKeyResponse['keyText'];
                    \Log::info('Private key created successfully', [
                        'key_id' => $privateKeyResponse['id'] ?? 'unknown'
                    ]);
                } else {
                    \Log::warning('Failed to create private key', [
                        'response' => $privateKeyResponse
                    ]);
                }
                
                // Check again for keys after creating private key to avoid race conditions
                if (!empty($privateKey)) {
                    $updatedKeys = $this->nmiService->checkExistingApiKeys($gatewayId);
                    // If public key appeared in the meantime, use it
                    if (isset($updatedKeys['public_key']) && !empty($updatedKeys['public_key'])) {
                        $publicKey = $updatedKeys['public_key'];
                        \Log::info('Found public key after creating private key', [
                            'gateway_id' => $gatewayId
                        ]);
                    }
                }
            }
            
            // Step 2: Create public key if still needed
            if (!$publicKey) {
                \Log::info('Creating public key for merchant', ['gateway_id' => $gatewayId]);
                // Create public key for tokenization
                $publicKeyResponse = $this->nmiService->createPublicApiKey($gatewayId, 'Public Key for Tokenization');
                if ($publicKeyResponse && isset($publicKeyResponse['keyText'])) {
                    $publicKey = $publicKeyResponse['keyText'];
                    \Log::info('Public key created successfully', [
                        'key_id' => $publicKeyResponse['id'] ?? 'unknown'
                    ]);
                } else {
                    \Log::warning('Failed to create public key', [
                        'response' => $publicKeyResponse
                    ]);
                }
            }
            
            // Final result
            if ($privateKey && $publicKey) {
                \Log::info('Successfully retrieved/generated API keys for merchant', [
                    'gateway_id' => $gatewayId,
                    'both_keys_obtained' => true
                ]);
                
                return [
                    'success' => true,
                    'private_key' => $privateKey,
                    'public_key' => $publicKey
                ];
            } else {
                // Log what failed
                \Log::warning('Failed to get or generate one or both API keys', [
                    'gateway_id' => $gatewayId,
                    'private_key_created' => !empty($privateKey),
                    'public_key_created' => !empty($publicKey)
                ]);
                
                // If we got at least one key, return what we have
                if ($privateKey || $publicKey) {
                    return [
                        'success' => true,
                        'private_key' => $privateKey ?: '',
                        'public_key' => $publicKey ?: '',
                        'message' => 'Only partial keys were available/generated'
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
                    'businessName' => $user->profile ? $user->profile->business_name : 'No profile',
                    'dateCreated' => $user->created_at->format('Y-m-d'),
                    'merchantId' => $user->profile ? $user->profile->merchant_id : null,
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
            'public_key' => $user->profile->public_key,
            'private_key' => $user->profile->private_key
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
            'public_key' => ['required', 'string', 'max:255'],
            'private_key' => ['required', 'string', 'max:255'],
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
            'public_key' => $request->public_key,
            'private_key' => $request->private_key,
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
                    'message' => 'Invalid Gateway ID or merchant not found',
                    'public_key' => '',
                    'private_key' => ''
                ], 404);
            }
            
            // Generate API keys using the updated method that checks for existing keys
            $apiKeys = $this->generateMerchantApiKeys($gatewayId);
            
            $publicKey = isset($apiKeys['public_key']) ? $apiKeys['public_key'] : '';
            $privateKey = isset($apiKeys['private_key']) ? $apiKeys['private_key'] : '';
            $isSuccess = isset($apiKeys['success']) ? $apiKeys['success'] : false;
            $message = isset($apiKeys['message']) ? $apiKeys['message'] : 'API keys generated successfully';
            
            \Log::info('API key generation result for gateway ID: ' . $gatewayId, [
                'success' => $isSuccess,
                'has_public_key' => !empty($publicKey),
                'has_private_key' => !empty($privateKey),
                'message' => $message
            ]);
            
            if ($isSuccess) {
                return response()->json([
                    'success' => true,
                    'message' => $message,
                    'public_key' => $publicKey,
                    'private_key' => $privateKey
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $message,
                    'public_key' => $publicKey,
                    'private_key' => $privateKey
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
                'message' => 'An error occurred while generating API keys: ' . $e->getMessage(),
                'public_key' => '',
                'private_key' => ''
            ], 500);
        }
    }

    /**
     * Generate API keys for an existing user
     * 
     * @param User $user
     * @return \Illuminate\Http\JsonResponse
     */
    public function generateApiKeys(User $user)
    {
        try {
            // Get the gateway ID from the user's profile
            $gatewayId = $user->profile->merchant_id;
            
            if (!$gatewayId) {
                return response()->json([
                    'success' => false,
                    'error' => 'User does not have a valid merchant ID',
                    'public_key' => '',
                    'private_key' => ''
                ], 400);
            }
            
            // Check if keys already exist in the database
            if ($user->profile->public_key && $user->profile->private_key) {
                return response()->json([
                    'success' => false,
                    'error' => 'API keys already exist for this user',
                    'public_key' => $user->profile->public_key,
                    'private_key' => $user->profile->private_key
                ], 400);
            }
            
            // Generate API keys
            $apiKeys = $this->generateMerchantApiKeys($gatewayId);
            
            if ($apiKeys['success']) {
                $publicKey = isset($apiKeys['public_key']) ? $apiKeys['public_key'] : '';
                $privateKey = isset($apiKeys['private_key']) ? $apiKeys['private_key'] : '';
                
                // Make sure we have both keys to save
                if (empty($publicKey) || empty($privateKey)) {
                    \Log::error('Missing keys in successful API key generation', [
                        'has_public_key' => !empty($publicKey),
                        'has_private_key' => !empty($privateKey)
                    ]);
                    
                    return response()->json([
                        'success' => false,
                        'error' => 'API keys were not properly generated. Missing ' . 
                                   (empty($publicKey) ? 'public key' : '') . 
                                   (empty($publicKey) && empty($privateKey) ? ' and ' : '') . 
                                   (empty($privateKey) ? 'private key' : ''),
                        'public_key' => $publicKey,
                        'private_key' => $privateKey
                    ], 400);
                }
                
                // Update the user profile with the new keys
                $user->profile->update([
                    'public_key' => $publicKey,
                    'private_key' => $privateKey
                ]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'API keys generated successfully',
                    'public_key' => $publicKey,
                    'private_key' => $privateKey
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => $apiKeys['message'] ?? 'Failed to generate API keys with no specific error',
                    'public_key' => '',
                    'private_key' => ''
                ], 400);
            }
        } catch (\Exception $e) {
            \Log::error('Error generating API keys: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'An error occurred while generating API keys: ' . $e->getMessage(),
                'public_key' => '',
                'private_key' => ''
            ], 500);
        }
    }

    /**
     * Check if a merchant ID already exists in the database
     * 
     * @param string $merchantId
     * @return \Illuminate\Http\JsonResponse
     */
    public function checkMerchantExists($merchantId)
    {
        try {
            \Log::info('Checking if merchant ID exists: ' . $merchantId);
            
            // Check if any user profile exists with this merchant ID
            $exists = UserProfile::where('merchant_id', $merchantId)->exists();
            
            return response()->json([
                'exists' => $exists,
                'message' => $exists ? 'A user with this merchant ID already exists' : 'Merchant ID is available'
            ]);
        } catch (\Exception $e) {
            \Log::error('Error checking merchant existence: ' . $e->getMessage());
            return response()->json([
                'exists' => false,
                'message' => 'An error occurred while checking merchant existence: ' . $e->getMessage()
            ], 500);
        }
    }
}