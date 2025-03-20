<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Services\NmiService;

class CreateUserProfileRequest extends FormRequest
{
    protected $nmiService;

    public function __construct(NmiService $nmiService)
    {
        parent::__construct();
        $this->nmiService = $nmiService;
    }

    public function authorize(): bool
    {
        return $this->user() && $this->user()->usertype === 'admin'; // Check if authenticated user is admin
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'business_name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:255'],
            'phone_number' => ['required', 'string', 'size:10', 'regex:/^[0-9]+$/'],
            'merchant_id' => ['required', 'string', 'max:255'],
            'gateway_id' => ['required', 'string', 'max:255'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * Configure the validator instance.
     *
     * @param  \Illuminate\Validation\Validator  $validator
     * @return void
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Check if gateway_id is valid by attempting to fetch merchant info
            $gatewayId = $this->input('gateway_id');
            $merchantId = $this->input('merchant_id');
            
            // Ensure merchant_id matches gateway_id
            if ($gatewayId !== $merchantId) {
                $validator->errors()->add('merchant_id', 'The merchant ID must match the gateway ID.');
                return;
            }
            
            // Validate gateway ID by checking if merchant exists
            $merchantData = $this->nmiService->getMerchantInfo($gatewayId);
            if (!$merchantData) {
                $validator->errors()->add('gateway_id', 'The provided gateway ID is not valid or the merchant could not be found.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'phone_number.size' => 'The phone number must be exactly 10 digits.',
            'phone_number.regex' => 'The phone number must contain only numbers.',
            'email.unique' => 'This email is already registered.',
            'password.min' => 'The password must be at least 8 characters.',
            'gateway_id.required' => 'The gateway ID is required to create a user.',
            'merchant_id.same' => 'The merchant ID must match the gateway ID.',
            // Add any custom error messages you want
        ];
    }
}