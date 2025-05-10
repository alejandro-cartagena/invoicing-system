# System Architecture

## Overview

The Invoice Management System is built using Laravel 11 with React and Inertia.js for the frontend. The system follows a traditional MVC architecture with additional layers for payment processing and real-time notifications.

## System Components

### 1. Authentication & Authorization
- Uses Laravel's built-in authentication system
- Role-based access control (Admin, Merchant)
- Session-based authentication with CSRF protection
- Password reset functionality

### 2. Database Schema

#### Users Table
- Basic user information
- Role management
- API credentials

#### Invoices Table
- Invoice details
- Payment status
- Client information
- Tax information
- NMI integration details

#### Invoice Items Table
- Line items for invoices
- Quantity and rate information
- Tax calculations

#### Payments Table
- Payment records
- Transaction IDs
- Payment methods
- Status tracking

### 3. Key Components

#### Payment Processing
1. **Credit Card Processing (NMI)**
   - Tokenization using Collect.js
   - Secure payment processing
   - Transaction verification
   - Error handling

2. **Cryptocurrency Processing (Bead)**
   - Bitcoin payment integration
   - Payment verification
   - Exchange rate handling

#### Email System
- MJML templates for responsive emails
- Multiple email types:
  - Invoice notifications
  - Payment receipts
  - Password resets
  - Welcome emails

#### PDF Generation
- Invoice PDF generation
- Custom templates
- Dynamic content insertion

#### Real-time Updates
- Pusher integration for live updates
- Payment status notifications
- Invoice status changes

## File Structure

```
invoicing-system/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Admin/
│   │   │   ├── Merchant/
│   │   │   └── Payment/
│   │   ├── Middleware/
│   │   └── Requests/
│   ├── Models/
│   ├── Services/
│   │   ├── Payment/
│   │   └── Notification/
│   └── Events/
├── resources/
│   ├── js/
│   │   ├── Components/
│   │   ├── Layouts/
│   │   └── Pages/
│   └── views/
│       └── emails/
│           └── mjml/
├── routes/
│   ├── web.php
│   └── api.php
└── config/
    ├── payment.php
    └── services.php
```

## Authentication Flow

1. User registration/login
2. Session creation
3. Role verification
4. Access control middleware
5. API token generation (for merchants)

## Payment Processing Flow

### Credit Card Payments
1. Client initiates payment
2. Collect.js tokenization
3. Token sent to backend
4. NMI payment processing
5. Transaction verification
6. Status update
7. Notification dispatch

### Cryptocurrency Payments
1. Client selects Bitcoin payment
2. Bead payment initiation
3. QR code generation
4. Payment monitoring
5. Transaction confirmation
6. Status update
7. Notification dispatch

## Security Measures

1. **Data Protection**
   - CSRF protection
   - XSS prevention
   - SQL injection protection
   - Input validation

2. **Payment Security**
   - PCI compliance
   - Tokenization
   - Secure API communication
   - Error handling

3. **Access Control**
   - Role-based permissions
   - API key management
   - Session security
   - Rate limiting

## Error Handling

1. **Payment Errors**
   - Transaction failures
   - Network issues
   - Invalid tokens
   - Insufficient funds

2. **System Errors**
   - Database errors
   - API failures
   - Email delivery issues
   - PDF generation errors

## Monitoring and Logging

1. **Payment Logs**
   - Transaction attempts
   - Success/failure rates
   - Error tracking
   - Performance metrics

2. **System Logs**
   - Error logging
   - User actions
   - API calls
   - Performance monitoring

## Deployment Considerations

1. **Server Requirements**
   - PHP 8.1+
   - MySQL 8.0+
   - Node.js 16+
   - SSL certificate
   - SMTP server

2. **Environment Setup**
   - Production configuration
   - API credentials
   - Database optimization
   - Cache configuration

3. **Maintenance**
   - Regular updates
   - Backup procedures
   - Security patches
   - Performance monitoring 