# Invoice Management System

A comprehensive invoice management system that allows merchants to create, send, and manage invoices with integrated payment processing capabilities.

## Features

- Invoice creation and management
- Multiple invoice types (General and Real Estate)
- Integrated payment processing
  - Credit card payments via NMI
  - Cryptocurrency payments via Bead
- Email notifications
- PDF generation
- Real-time payment notifications
- Merchant dashboard
- Admin panel for user management

## Technology Stack

- **Backend**: Laravel 11.x
- **Frontend**: React with Inertia.js
- **Database**: MySQL
- **Payment Processing**:
  - NMI (Network Merchants Inc.) for credit card processing
  - Bead for cryptocurrency payments
- **Email**: Laravel Mail with MJML templates
- **PDF Generation**: DomPDF
- **Real-time Updates**: Pusher

## API Integrations

### Payment Processing APIs

#### NMI (Network Merchants Inc.)
- **Documentation**: 
   - [NMI API Documentation](https://docs.nmi.com/reference/getting-started)
   - [DVF Integration Portal](https://dvfsolutions.transactiongateway.com/merchants/resources/integration/integration_portal.php?tid=581c667d67acba28d1d0017dbed4a607)
- **Features**:
  - Credit card processing
  - Payment tokenization
  - Transaction management
  - Webhook notifications
  - Customer vault management

#### Bead
- **Documentation**: 
  - [Bead Developer Portal](https://developers.bead.xyz/)
  - [Bead API Reference](https://api.test.devs.beadpay.io/apidocs/index.html)
- **Features**:
  - Cryptocurrency payment processing
  - Digital wallet integration
  - Merchant onboarding
  - Transaction reporting
  - Settlement management


### API Configuration
Each API requires specific configuration in your `.env` file:

```env
# NMI Configuration
NMI_API_KEY=

# Bead Configuration
BEAD_API_URL=
BEAD_AUTH_URL=

```

For detailed API integration documentation and implementation details, please refer to the `/docs` directory.

## Project Structure

### Backend Structure (`/app`)
- `Http/Controllers/` - All application controllers
- `Http/Middleware/` - Custom middleware
- `Mail/` - Email classes and templates
- `Models/` - Eloquent models
- `Services/` - Business logic and external service integrations
- `Events/` - Event classes
- `Providers/` - Service providers

### Frontend Structure (`/resources`)
- `js/` - React components and frontend logic
  - `Components/` - Reusable React components
  - `Pages/` - Page components
  - `Layouts/` - Layout components
- `css/` - Stylesheets
- `views/` - Blade templates
- `mjml/` - Email templates in MJML format

### Routes
- `routes/web.php` - Web routes
- `routes/api.php` - API routes

For detailed documentation about the codebase structure and development guidelines, please refer to the `/docs` directory.

## Prerequisites

Before you begin, ensure you have the following installed:
- PHP 8.2 or higher
- Node.js 18.x or higher
- MySQL 8.0 or higher
- Composer
- NPM/Yarn
- XAMPP (for local development)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/alejandro-cartagena/invoicing-system
   cd invoicing-system
   ```

2. **Install PHP dependencies**
   ```bash
   composer install
   ```

3. **Install JavaScript dependencies**
   ```bash
   npm install
   ```

4. **Set up environment file**
   ```bash
   cp .env.example .env
   ```

5. **Generate application key**
   ```bash
   php artisan key:generate
   ```

6. **Configure XAMPP**
   - Start XAMPP Control Panel
   - Start Apache and MySQL services
   - Create a new database in phpMyAdmin (http://localhost/phpmyadmin)
   - Note down the database name for the next step

7. **Configure your database in `.env`**
   ```
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=invoicing_system
   DB_USERNAME=root
   DB_PASSWORD=
   ```

8. **Run migrations and seed the database**
   ```bash
   php artisan migrate
   php artisan db:seed
   ```

9. **Build assets**
   ```bash
   npm run build
   ```

10. **Start the development server**
    ```bash
    php artisan serve
    ```

11. **In a separate terminal, start Vite for frontend development**
    ```bash
    npm run dev
    ```

## Development Workflow

1. **Start XAMPP**
   - Open XAMPP Control Panel
   - Start Apache and MySQL services
   - Ensure both services are running (green)

2. **Start Laravel development server**
   ```bash
   php artisan serve
   ```
   Your application will be available at http://localhost:8000

3. **Start Vite development server**
   ```bash
   npm run dev
   ```
   This will watch for changes in your React components

## Environment Variables

Required environment variables:

```
# App
APP_NAME=InvoiceSystem
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=invoicing_system
DB_USERNAME=root
DB_PASSWORD=

# Mail
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS=null
MAIL_FROM_NAME="${APP_NAME}"

# Pusher (For in app notifications)
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME=https
PUSHER_APP_CLUSTER=mt1

# NMI Configuration
NMI_SECURITY_KEY=
NMI_TOKENIZATION_KEY=

# Bead Configuration
BEAD_API_KEY=
BEAD_TERMINAL_ID=
```

## Common Commands

```bash
# Start development server
php artisan serve

# Run migrations
php artisan migrate

# Clear cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Build assets
npm run build

# Watch for changes
npm run dev

# Create a new user
php artisan make:user

# Generate API keys
php artisan key:generate
```

## Testing

```bash
# Run all tests
php artisan test

# Run specific test
php artisan test --filter=TestName
```

## Deployment

1. Set up production environment variables
2. Run migrations
3. Build assets for production
4. Configure web server (Apache/Nginx)
5. Set up SSL certificates
6. Configure cron jobs for scheduled tasks

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Support

For support, please contact [support email/contact information].

