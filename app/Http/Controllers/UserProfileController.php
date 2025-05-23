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
use Illuminate\Support\Facades\DB;
use App\Models\BeadCredential;

class UserProfileController extends Controller
{
    protected $nmiService;

    /**
     * Constructor for UserProfileController
     * 
     * Injects the NMI service dependency for payment gateway operations.
     * 
     * @param NmiService $nmiService The NMI payment gateway service
     */
    public function __construct(NmiService $nmiService)
    {
        $this->nmiService = $nmiService;
    }

    /**
     * Display the form for creating a new user
     * 
     * Renders the user creation page for administrators.
     * 
     * @return \Inertia\Response Renders the user creation form
     */
    public function create()
    {
        return Inertia::render('Admin/CreateUser');
    }

    /**
     * Store a newly created user in the database
     * 
     * Validates user input, creates a new user account with profile information,
     * generates API keys for the payment gateway, and optionally creates
     * Bead cryptocurrency credentials if requested.
     * 
     * @param Request $request Contains user details, profile information, and optional Bead credentials
     * @return \Illuminate\Http\RedirectResponse Redirects to the user view page on success
     */
    public function store(Request $request)
    {
        \Log::info('Starting user creation process', ['request_data' => $request->all()]);

        try {
            $validated = $request->validate([
                'email' => 'required|string|email|max:255|unique:users',
                'password' => 'required|string|min:8|confirmed',
                'business_name' => 'required|string|max:255',
                'address' => 'required|string|max:255',
                'phone_number' => 'required|string|max:20',
                'merchant_id' => 'required|string|max:255|unique:user_profiles,merchant_id',
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'gateway_id' => 'required|string|max:255',
                // Add validation for Bead credentials
                'add_bead_credentials' => 'boolean',
                'bead_merchant_id' => 'required_if:add_bead_credentials,true|string|max:255',
                'bead_terminal_id' => 'required_if:add_bead_credentials,true|string|max:255',
                'bead_username' => 'required_if:add_bead_credentials,true|string|max:255',
                'bead_password' => 'required_if:add_bead_credentials,true|string|max:255',
            ]);

            \Log::info('Validation passed', ['validated_data' => $validated]);

            DB::beginTransaction();

            // Create the user
            $user = User::create([
                'name' => $validated['first_name'] . ' ' . $validated['last_name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'usertype' => 'user',
            ]);

            \Log::info('User created', ['user_id' => $user->id]);

            // Generate API keys for the merchant first
            $apiKeys = $this->generateMerchantApiKeys($validated['gateway_id']);
            
            if (!$apiKeys['success']) {
                throw new \Exception('Failed to generate API keys: ' . ($apiKeys['message'] ?? 'Unknown error'));
            }

            // Create the user profile with the API keys
            $profile = $user->profile()->create([
                'business_name' => $validated['business_name'],
                'address' => $validated['address'],
                'phone_number' => $validated['phone_number'],
                'merchant_id' => $validated['merchant_id'],
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'gateway_id' => $validated['gateway_id'],
                'private_key' => $apiKeys['private_key'],
                'public_key' => $apiKeys['public_key']
            ]);

            \Log::info('User profile created', ['profile_id' => $profile->id]);

            // Create Bead credentials if requested
            if ($request->add_bead_credentials) {
                $beadCredential = new BeadCredential();
                $beadCredential->user_id = $user->id;
                $beadCredential->merchant_id = $validated['bead_merchant_id'];
                $beadCredential->terminal_id = $validated['bead_terminal_id'];
                $beadCredential->username = $validated['bead_username'];
                $beadCredential->password = $validated['bead_password']; // This will trigger the setPasswordAttribute mutator
                $beadCredential->status = 'manual';
                $beadCredential->onboarding_status = 'NEEDS_INFO';
                $beadCredential->save();

                \Log::info('Bead credentials created', ['bead_credential_id' => $beadCredential->id]);
            }

            DB::commit();

            \Log::info('User creation completed successfully');

            return redirect()->route('admin.users.view', ['user' => $user->id])
                ->with('success', 'User created successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation error during user creation', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            throw $e;
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error during user creation', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return back()->with('error', 'Failed to create user: ' . $e->getMessage());
        }
    }

    /**
     * Generate public and private API keys for a merchant
     * 
     * Checks for existing API keys first, then creates new keys if needed.
     * Creates keys sequentially (private key first, then public key) to avoid
     * race conditions and duplicate key generation.
     * 
     * @param string $gatewayId The gateway ID for the merchant
     * @return array Contains success status, public/private keys, and status message
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

    /**
     * Display a listing of all users
     * 
     * Retrieves all users with 'user' type, loads their profiles,
     * and formats the data for display in the admin dashboard.
     * 
     * @return \Inertia\Response Renders the users list view
     */
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

    /**
     * Remove the specified user from the database
     * 
     * Deletes a user and their associated profile (via cascade).
     * 
     * @param User $user The user to be deleted
     * @return \Illuminate\Http\RedirectResponse Redirects back with success/error message
     */
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

    /**
     * Display detailed information for a specific user
     * 
     * Retrieves user and profile information and formats it for display.
     * 
     * @param User $user The user to view
     * @return \Inertia\Response Renders the user detail view
     */
    public function view(User $user)
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

        return Inertia::render('Admin/users/ViewUser', [
            'user' => $userData
        ]);
    }

    /**
     * Update the specified user in the database
     * 
     * Validates and updates both user and profile information.
     * 
     * @param Request $request Contains updated user and profile information
     * @param User $user The user to be updated
     * @return \Illuminate\Http\RedirectResponse Redirects to users list with success message
     */
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

    /**
     * Fetch merchant information from the NMI gateway
     * 
     * Retrieves merchant details using the gateway ID.
     * 
     * @param string $gatewayId The gateway ID to look up
     * @return \Illuminate\Http\JsonResponse Merchant information or error message
     */
    public function fetchMerchantInfo($gatewayId)
    {
        try {
            \Log::info('Fetching merchant info - Request details', [
                'gateway_id' => $gatewayId,
                'request_path' => request()->path(),
                'request_method' => request()->method(),
                'user' => auth()->user() ? [
                    'id' => auth()->user()->id,
                    'email' => auth()->user()->email,
                    'usertype' => auth()->user()->usertype
                ] : 'not authenticated',
                'headers' => request()->headers->all()
            ]);
            
            $merchantData = $this->nmiService->getMerchantInfo($gatewayId);
            
            if ($merchantData) {
                \Log::info('Merchant info fetched successfully', [
                    'gateway_id' => $gatewayId,
                    'merchant_data' => $merchantData
                ]);
                return response()->json([
                    'success' => true,
                    'message' => 'Merchant information fetched successfully',
                    'merchant' => $merchantData
                ]);
            } else {
                \Log::warning('Failed to fetch merchant info - No data returned', [
                    'gateway_id' => $gatewayId
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch merchant information. Please check the Gateway ID and try again.'
                ], 404);
            }
        } catch (\Exception $e) {
            \Log::error('Error fetching merchant info', [
                'gateway_id' => $gatewayId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while fetching merchant information: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate API keys for a merchant gateway ID and return them
     * 
     * Verifies the merchant exists before attempting to generate keys.
     * Used as an API endpoint for key generation requests.
     * 
     * @param string $gatewayId The gateway ID for the merchant
     * @return \Illuminate\Http\JsonResponse Generated API keys or error message
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
     * Checks if the user has a valid merchant ID and doesn't already have keys,
     * then generates and saves new API keys to the user's profile.
     * 
     * @param User $user The user to generate keys for
     * @return \Illuminate\Http\JsonResponse Generated API keys or error message
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
     * Verifies whether a merchant ID is already in use by another user.
     * 
     * @param string $merchantId The merchant ID to check
     * @return \Illuminate\Http\JsonResponse Existence status and message
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