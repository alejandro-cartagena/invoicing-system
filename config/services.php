<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'bead' => [
        'api_url' => env('BEAD_API_URL'),
        'auth_url' => env('BEAD_AUTH_URL'),
        'merchant_id' => env('BEAD_MERCHANT_ID'),
        'terminal_id' => env('BEAD_TERMINAL_ID'),
        'username' => env('BEAD_USERNAME'),
        'password' => env('BEAD_PASSWORD'),
    ],

    'nmi' => [
        'api_key' => env('NMI_API_KEY'),
        'base_url' => 'https://secure.nmi.com/api/v4',
    ],

];
