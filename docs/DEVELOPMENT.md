# Development Documentation

## Codebase Structure

### Backend (`/app`)

#### Controllers (`/app/Http/Controllers`)
- `InvoiceController.php` - Handles invoice creation, updates, and management
- `PaymentController.php` - Manages payment processing and callbacks
- `PaymentNotificationController.php` - Handles payment notifications
- `UserProfileController.php` - User profile management
- `ProfileController.php` - Basic profile functionality
- `NotificationController.php` - General notification handling
- `DvfWebhookController.php` - DVF webhook processing
- `BeadCredentialController.php` - Bead payment credentials management
- `HomeController.php` - Home page and dashboard
- `Auth/` - Authentication controllers

#### Services (`/app/Services`)
- `BeadPaymentService.php` - Cryptocurrency payment processing via Bead
- `NmiService.php` - Credit card payment processing via NMI

#### Mail (`/app/Mail`)
- `SendInvoiceMail.php` - Invoice sending notifications
- `PaymentReceiptMail.php` - Payment receipt emails
- `MerchantPaymentReceiptMail.php` - Merchant payment notifications

#### Models (`/app/Models`)
- `Invoice.php` - Invoice model and relationships
- `User.php` - User model
- `UserProfile.php` - User profile with encrypted keys and business details
- `Payment.php` - Payment model
- `Transaction.php` - Transaction records

### Frontend (`/resources`)

#### React File Structure (`/resources/js`)
- `/Components` - Reusable React components
- `/Pages` - Page components
- `/Layouts` - Layout components
- `/data` - Data management and API calls
- `/utils` - Utility functions
- `/styles` - Styling and CSS
- `/hooks` - Custom React hooks
- `/images` - Image assets
- `app.jsx` - Main application entry point
- `bootstrap.js` - Application bootstrap
- `echo.js` - WebSocket configuration
- `serviceWorker.js` - PWA service worker

#### Email Templates (`/resources/mjml`)
- `invoice-created.mjml` - New invoice email template
- `payment-received.mjml` - Payment confirmation template
- `invoice-reminder.mjml` - Payment reminder template

### Routes
- `routes/web.php` - Web routes for the main application
- `routes/api.php` - API endpoints for webhook processing and data access

## API Integration

### Payment Processing Services

#### NMI Integration
- **Service Class**: `app/Services/NmiService.php`
- **Documentation**: 
  - [NMI API Documentation](https://docs.nmi.com/reference/getting-started)
  - [DVF Integration Portal](https://dvfsolutions.transactiongateway.com/merchants/resources/integration/integration_portal.php?tid=581c667d67acba28d1d0017dbed4a607)
- **Configuration**:
  ```env
  NMI_API_KEY=your_api_key
  ```
- **Key Features**:
  - Credit card processing
  - Payment tokenization
  - Transaction management
  - Webhook notifications
  - Customer vault management
- **Implementation Notes**:
  - Uses Laravel's HTTP client for API requests
  - Implements webhook handling for payment notifications
  - Includes error handling and logging
  - Supports both test and production environments

#### Bead Integration
- **Service Class**: `app/Services/BeadPaymentService.php`
- **Documentation**: 
  - [Bead Developer Portal](https://developers.bead.xyz/)
  - [Bead API Reference](https://api.test.devs.beadpay.io/apidocs/index.html)
- **Configuration**:
  ```env
  BEAD_API_URL=your_api_url
  BEAD_AUTH_URL=your_auth_url
  ```
- **Key Features**:
  - Cryptocurrency payment processing
  - Digital wallet integration
  - Merchant onboarding
  - Transaction reporting
  - Settlement management
- **Implementation Notes**:
  - Handles cryptocurrency payment processing
  - Manages merchant credentials
  - Implements webhook handling
  - Includes comprehensive error handling

### Webhook Handling

#### NMI Webhooks
- **Controller**: `app/Http/Controllers/PaymentNotificationController.php`
- **Route**: `routes/api.php`
- **Events Handled**:
  - Payment success/failure
  - Transaction updates
  - Customer vault updates

#### Bead Webhooks
- **Controller**: `app/Http/Controllers/DvfWebhookController.php`
- **Route**: `routes/api.php`
- **Events Handled**:
  - Payment status updates
  - Transaction confirmations
  - Settlement notifications

### Error Handling
- All API services implement standardized error handling
- Errors are logged using Laravel's logging system
- Custom exceptions for different error types
- Retry mechanisms for failed requests
- Detailed error messages for debugging


## Development Guidelines

### Component Development
- Create reusable components in `/resources/js/Components`
- Implement proper prop validation
- Follow React best practices for state management

### Email Development
- Use MJML for responsive email templates
- Test emails across different email clients
- Follow email design best practices

## Common Development Tasks

### Adding a New Feature
1. Create necessary database migrations
2. Add model and relationships
3. Implement controller methods
4. Create React components
5. Add routes
6. Test Code

### Creating New Email Templates
1. Create MJML template in `/resources/mjml`
2. Add corresponding Mail class in `/app/Mail`
3. Test template in different email clients

