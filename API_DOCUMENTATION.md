# API Documentation

## Authentication

All API endpoints except webhooks require authentication using Laravel Sanctum. Include the authentication token in the request header:

```
Authorization: Bearer <your-token>
```

## API Endpoints

### User Management

#### Get Current User
- **Endpoint:** `/api/user`
- **Method:** GET
- **Authentication:** Required
- **Description:** Returns the currently authenticated user's information

### Bead Integration

#### Get Bead Credentials
- **Endpoint:** `/api/bead-credentials/{userId}`
- **Method:** GET
- **Authentication:** Required
- **Description:** Retrieves Bead payment credentials for a specific user

### Webhooks

#### Bead Webhook
- **Endpoint:** `/api/webhooks/bead`
- **Method:** POST
- **Authentication:** None
- **Description:** Handles incoming webhooks from Bead payment service

#### DVF Webhook
- **Endpoint:** `/api/dvf/webhook`
- **Method:** POST
- **Authentication:** None
- **Description:** Handles incoming webhooks from DVF service

### Testing

#### Test API Status
- **Endpoint:** `/api/test`
- **Method:** GET
- **Authentication:** None
- **Description:** Verifies that the API is operational

## Web Routes (Frontend)

### Authentication

#### Login
- **Endpoint:** `/login`
- **Method:** GET
- **Authentication:** None
- **Description:** Displays the login form

#### Register
- **Endpoint:** `/register`
- **Method:** GET
- **Authentication:** None
- **Description:** Displays the registration form

### Dashboard

#### User Dashboard
- **Endpoint:** `/dashboard`
- **Method:** GET
- **Authentication:** Required
- **Description:** Displays the user's dashboard

#### Admin Dashboard
- **Endpoint:** `/admin/dashboard`
- **Method:** GET
- **Authentication:** Required (Admin)
- **Description:** Displays the admin dashboard

### Invoice Management

#### List Invoices
- **Endpoint:** `/invoices`
- **Method:** GET
- **Authentication:** Required
- **Description:** Lists all invoices for the authenticated user

#### View Invoice
- **Endpoint:** `/invoice/view/{invoice}`
- **Method:** GET
- **Authentication:** Required
- **Description:** Displays a specific invoice

#### Download Invoice
- **Endpoint:** `/invoice/download/{invoice}`
- **Method:** GET
- **Authentication:** Required
- **Description:** Downloads a specific invoice

#### Create Invoice
- **Endpoint:** `/create-invoices`
- **Method:** GET
- **Authentication:** Required
- **Description:** Displays the invoice creation form

#### General Invoice
- **Endpoint:** `/general-invoice`
- **Method:** GET
- **Authentication:** Required
- **Description:** Displays the general invoice creation form

#### Real Estate Invoice
- **Endpoint:** `/real-estate-invoice`
- **Method:** GET
- **Authentication:** Required
- **Description:** Displays the real estate invoice creation form

### Payment Processing

#### Create Crypto Payment
- **Endpoint:** `/invoice/create-crypto-payment`
- **Method:** POST
- **Authentication:** Required
- **Description:** Creates a new cryptocurrency payment through Bead integration

#### Process Credit Card Payment
- **Endpoint:** `/invoice/process-credit-card`
- **Method:** POST
- **Authentication:** Required
- **Description:** Processes a credit card payment through the NMI gateway

#### Verify Bead Payment Status
- **Endpoint:** `/verify-bead-payment-status`
- **Method:** GET
- **Authentication:** Required
- **Description:** Verifies the status of a Bead cryptocurrency payment

#### Credit Card Payment Form
- **Endpoint:** `/invoice/pay/{token}/credit-card`
- **Method:** GET
- **Authentication:** None
- **Description:** Displays the credit card payment form

#### Bitcoin Payment Form
- **Endpoint:** `/invoice/pay/{token}/bitcoin`
- **Method:** GET
- **Authentication:** None
- **Description:** Displays the Bitcoin payment form

#### Payment Success
- **Endpoint:** `/payment-success`
- **Method:** GET
- **Authentication:** None
- **Description:** Displays the payment success page

### Admin Management

#### User Management
- **Endpoint:** `/admin/users`
- **Method:** GET
- **Authentication:** Required (Admin)
- **Description:** Lists all users

#### Create User
- **Endpoint:** `/admin/create`
- **Method:** GET
- **Authentication:** Required (Admin)
- **Description:** Displays the user creation form

#### View User
- **Endpoint:** `/admin/users/{user}/view`
- **Method:** GET
- **Authentication:** Required (Admin)
- **Description:** Displays a specific user's details

#### Generate API Keys
- **Endpoint:** `/admin/users/{user}/generate-api-keys`
- **Method:** POST
- **Authentication:** Required (Admin)
- **Description:** Generates API keys for a specific user

#### Generate Merchant API Keys
- **Endpoint:** `/admin/generate-merchant-api-keys/{gateway_id}`
- **Method:** POST
- **Authentication:** Required (Admin)
- **Description:** Generates merchant API keys for a specific gateway

#### Fetch Merchant Info
- **Endpoint:** `/admin/fetch-merchant-info/{gateway_id}`
- **Method:** GET
- **Authentication:** Required (Admin)
- **Description:** Retrieves merchant information for a specific gateway

#### Check Merchant Exists
- **Endpoint:** `/admin/check-merchant-exists/{merchant_id}`
- **Method:** GET
- **Authentication:** Required (Admin)
- **Description:** Checks if a merchant ID already exists

### Profile Management

#### Edit Profile
- **Endpoint:** `/profile`
- **Method:** GET
- **Authentication:** Required
- **Description:** Displays the profile edit form

#### Update Profile
- **Endpoint:** `/profile`
- **Method:** PATCH
- **Authentication:** Required
- **Description:** Updates the user's profile

#### Delete Profile
- **Endpoint:** `/profile`
- **Method:** DELETE
- **Authentication:** Required
- **Description:** Deletes the user's account

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests:

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 500: Server Error

## CORS Configuration

The API's CORS configuration is environment-dependent:

- Development: `http://localhost:3000`
- Production: `https://voltmsinvoicing.com`

The CORS configuration can be found in `config/cors.php`. When deploying to different environments, make sure to update the `allowed_origins` array accordingly.

All API routes support credentials and allow all methods and headers.

## Security

- CSRF protection is enabled for all routes except webhooks
- Authentication is required for most endpoints
- Admin middleware is used to protect admin-specific routes
- API tokens are required for API access
- Password confirmation is required for sensitive operations 