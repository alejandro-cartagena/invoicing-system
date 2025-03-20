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
        // Store the API key in your .env file
        $this->apiKey = env('NMI_API_KEY', 'v4_secret_737QNB2hSPKvqzf4hAnG789x8way3r6U');
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
} 