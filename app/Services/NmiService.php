<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Exception;

class NmiService
{
    private $apiKey;
    private $baseUrl = 'https://secure.nmi.com/api/v4';

    public function __construct()
    {
        // Get the API key from .env file with no default value
        $this->apiKey = env('NMI_API_KEY');
        
        // Check if the API key is missing
        if (empty($this->apiKey)) {
            Log::critical('NMI API key is missing from .env file. This is required for NMI API integration.');
        }
    }

    /**
     * Fetch merchant information by gateway ID
     *
     * @param string $gatewayId
     * @return array|null
     */
    public function getMerchantInfo($gatewayId)
    {
        try {
            $curl = curl_init();

            curl_setopt_array($curl, [
                CURLOPT_URL => "{$this->baseUrl}/merchants/{$gatewayId}",
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => "",
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => "GET",
                CURLOPT_HTTPHEADER => [
                    "Authorization: {$this->apiKey}",
                    "Content-Type: application/json",
                    "Accept: application/json"
                ],
            ]);

            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            $err = curl_error($curl);

            curl_close($curl);

            if ($err) {
                Log::error("NMI API cURL Error: {$err}");
                return null;
            }

            $data = json_decode($response, true);
            
            // Log the API response for debugging
            Log::info("NMI API Response for Gateway ID {$gatewayId}", [
                'status_code' => $httpCode,
                'response' => $data
            ]);
            
            if ($httpCode >= 200 && $httpCode < 300) {
                return $data;
            } else {
                Log::error("NMI API Error Response", [
                    'status_code' => $httpCode,
                    'response' => $data
                ]);
                return null;
            }
        } catch (Exception $e) {
            Log::error("Exception in NMI getMerchantInfo: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Create a private API key for a merchant with transaction permissions
     *
     * @param string $gatewayId
     * @param string $description
     * @return array|null
     */
    public function createPrivateApiKey($gatewayId, $description = 'Key for API Access')
    {
        try {
            $curl = curl_init();

            curl_setopt_array($curl, [
                CURLOPT_URL => "{$this->baseUrl}/merchants/{$gatewayId}/security_keys",
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => "",
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => "POST",
                CURLOPT_POSTFIELDS => json_encode([
                    'permissions' => [
                        'transaction'
                    ],
                    'description' => $description
                ]),
                CURLOPT_HTTPHEADER => [
                    "Authorization: {$this->apiKey}",
                    "Content-Type: application/json",
                    "Accept: application/json"
                ],
            ]);

            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            $err = curl_error($curl);

            curl_close($curl);

            if ($err) {
                Log::error("NMI API cURL Error creating private key: {$err}");
                return null;
            }

            // Log the raw response
            Log::info("NMI API Raw Response for creating private key:", [
                'raw_response' => $response,
                'http_code' => $httpCode
            ]);

            $data = json_decode($response, true);
            
            // Detailed logging of the response structure
            Log::info("NMI API Decoded Response Structure:", [
                'response_keys' => is_array($data) ? array_keys($data) : 'not an array',
                'full_response' => $data
            ]);
            
            if ($httpCode >= 200 && $httpCode < 300) {
                return $data;
            } else {
                Log::error("NMI API Error Response creating private key", [
                    'status_code' => $httpCode,
                    'response' => $data
                ]);
                return null;
            }
        } catch (Exception $e) {
            Log::error("Exception in NMI createPrivateApiKey: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Create a public API key for a merchant with tokenization permissions
     *
     * @param string $gatewayId
     * @param string $description
     * @return array|null
     */
    public function createPublicApiKey($gatewayId, $description = 'Key for Tokenization')
    {
        try {
            $curl = curl_init();

            curl_setopt_array($curl, [
                CURLOPT_URL => "{$this->baseUrl}/merchants/{$gatewayId}/security_keys",
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => "",
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => "POST",
                CURLOPT_POSTFIELDS => json_encode([
                    'permissions' => [
                        'tokenization'
                    ],
                    'description' => $description
                ]),
                CURLOPT_HTTPHEADER => [
                    "Authorization: {$this->apiKey}",
                    "Content-Type: application/json",
                    "Accept: application/json"
                ],
            ]);

            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            $err = curl_error($curl);

            curl_close($curl);

            if ($err) {
                Log::error("NMI API cURL Error creating public key: {$err}");
                return null;
            }

            $data = json_decode($response, true);
            
            // Log the API response for debugging
            Log::info("NMI API Response for creating public key for Gateway ID {$gatewayId}", [
                'status_code' => $httpCode,
                'response' => $data
            ]);
            
            if ($httpCode >= 200 && $httpCode < 300) {
                return $data;
            } else {
                Log::error("NMI API Error Response creating public key", [
                    'status_code' => $httpCode,
                    'response' => $data
                ]);
                return null;
            }
        } catch (Exception $e) {
            Log::error("Exception in NMI createPublicApiKey: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Check if a merchant already has API keys
     *
     * @param string $gatewayId
     * @return array with keys_exist, public_key, private_key
     */
    public function checkExistingApiKeys($gatewayId)
    {
        // Initialize result with default values to avoid undefined index errors
        $result = [
            'keys_exist' => false,
            'public_key' => null,
            'private_key' => null
        ];

        try {
            $curl = curl_init();

            curl_setopt_array($curl, [
                CURLOPT_URL => "{$this->baseUrl}/merchants/{$gatewayId}/security_keys",
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => "",
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => "GET",
                CURLOPT_HTTPHEADER => [
                    "Authorization: {$this->apiKey}",
                    "Content-Type: application/json",
                    "Accept: application/json"
                ],
            ]);

            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            $err = curl_error($curl);

            curl_close($curl);

            if ($err) {
                Log::error("NMI API cURL Error checking existing keys: {$err}");
                return $result;
            }

            $data = json_decode($response, true);
            
            // Log the full API response for debugging
            Log::info("NMI API Response for checking existing keys for Gateway ID {$gatewayId}", [
                'status_code' => $httpCode,
                'full_response' => $data,
                'key_count' => isset($data['securityKeys']) ? count($data['securityKeys']) : 0
            ]);
            
            if ($httpCode >= 200 && $httpCode < 300 && isset($data['securityKeys']) && is_array($data['securityKeys'])) {
                $allKeys = [];
                
                // Look for existing tokenization (public) and transaction (private) keys
                foreach ($data['securityKeys'] as $key) {
                    // Track all keys we find for debugging
                    $permissions = isset($key['permissions']) && is_array($key['permissions']) ? 
                        implode(',', $key['permissions']) : 'unknown';
                    
                    $allKeys[] = [
                        'id' => $key['id'] ?? 'unknown',
                        'permissions' => $permissions,
                        'has_key_text' => isset($key['keyText']),
                        'description' => $key['description'] ?? 'no description'
                    ];
                    
                    if (isset($key['permissions']) && is_array($key['permissions'])) {
                        // Get the first tokenization key we find
                        if (in_array('tokenization', $key['permissions']) && isset($key['keyText']) && !$result['public_key']) {
                            $result['public_key'] = $key['keyText'];
                            Log::info("Found tokenization (public) key", [
                                'key_id' => $key['id'] ?? 'unknown',
                                'description' => $key['description'] ?? 'no description'
                            ]);
                        }
                        
                        // Get the first transaction key we find
                        if (in_array('transaction', $key['permissions']) && isset($key['keyText']) && !$result['private_key']) {
                            $result['private_key'] = $key['keyText'];
                            Log::info("Found transaction (private) key", [
                                'key_id' => $key['id'] ?? 'unknown',
                                'description' => $key['description'] ?? 'no description'
                            ]);
                        }
                    }
                }
                
                // Update keys_exist flag based on finding both keys
                $result['keys_exist'] = ($result['public_key'] && $result['private_key']);
                
                // Log what we found
                Log::info("Existing keys summary for Gateway ID {$gatewayId}", [
                    'found_public_key' => !empty($result['public_key']),
                    'found_private_key' => !empty($result['private_key']),
                    'total_keys_found' => count($allKeys),
                    'all_keys' => $allKeys
                ]);
            }
            
            return $result;
        } catch (Exception $e) {
            Log::error("Exception in NMI checkExistingApiKeys: " . $e->getMessage());
            return $result;
        }
    }
} 