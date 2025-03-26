<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        .invoice-box {
            max-width: 800px;
            margin: auto;
            padding: 30px;
            font-size: 16px;
            line-height: 24px;
            font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif;
            color: #555;
        }
        
        .header {
            margin-bottom: 30px;
        }
        
        .company-info {
            margin-bottom: 20px;
        }
        
        .client-info {
            margin-bottom: 20px;
        }
        
        .invoice-details {
            margin-bottom: 20px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .items-table th,
        .items-table td {
            padding: 10px;
            border-bottom: 1px solid #eee;
        }
        
        .totals {
            margin-top: 20px;
            text-align: right;
        }
        
        .real-estate-info {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #eee;
            border-radius: 5px;
        }
        
        .real-estate-field {
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">
            @if(isset($data['logo']) && $data['logo'])
                <img src="data:image/png;base64,{{ $data['logo'] }}" style="max-width: {{ $data['logoWidth'] ?? '150' }}px;">
            @endif
            <h1>{{ $data['title'] ?? 'Invoice' }}</h1>
        </div>

        <div class="company-info">
            <strong>{{ $data['companyName'] ?? '' }}</strong><br>
            {{ $data['companyAddress'] ?? '' }}<br>
            {{ $data['companyAddress2'] ?? '' }}<br>
            {{ $data['companyCountry'] ?? '' }}
        </div>

        <div class="client-info">
            <strong>{{ $data['billTo'] ?? 'Bill To:' }}</strong><br>
            {{ $data['clientName'] ?? '' }}<br>
            {{ $data['clientAddress'] ?? '' }}<br>
            {{ $data['clientAddress2'] ?? '' }}<br>
            {{ $data['clientCountry'] ?? '' }}
        </div>

        @if(isset($data['invoice_type']) && $data['invoice_type'] === 'real_estate')
            <div class="real-estate-info">
                <h3>Real Estate Information</h3>
                <div class="real-estate-field">
                    <strong>Property Address:</strong> {{ $data['propertyAddress'] ?? 'N/A' }}
                </div>
                <div class="real-estate-field">
                    <strong>Title Number:</strong> {{ $data['titleNumber'] ?? 'N/A' }}
                </div>
                <div class="real-estate-field">
                    <strong>Buyer Name:</strong> {{ $data['buyerName'] ?? 'N/A' }}
                </div>
                <div class="real-estate-field">
                    <strong>Seller Name:</strong> {{ $data['sellerName'] ?? 'N/A' }}
                </div>
                <div class="real-estate-field">
                    <strong>Real Estate Agent:</strong> {{ $data['agentName'] ?? 'N/A' }}
                </div>
            </div>
        @endif

        <div class="invoice-details">
            <table class="items-table">
                <thead>
                    <tr>
                        <th>{{ $data['productLineDescription'] ?? 'Description' }}</th>
                        <th>{{ $data['productLineQuantity'] ?? 'Quantity' }}</th>
                        <th>{{ $data['productLineQuantityRate'] ?? 'Rate' }}</th>
                        <th>{{ $data['productLineQuantityAmount'] ?? 'Amount' }}</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($data['productLines'] ?? [] as $item)
                        @if(isset($item['description']) && $item['description'])
                            <tr>
                                <td>{{ $item['description'] }}</td>
                                <td>{{ $item['quantity'] ?? '0' }}</td>
                                <td>{{ $data['currency'] ?? '$' }}{{ $item['rate'] ?? '0.00' }}</td>
                                <td>{{ $data['currency'] ?? '$' }}{{ number_format(($item['quantity'] ?? 0) * ($item['rate'] ?? 0), 2) }}</td>
                            </tr>
                        @endif
                    @endforeach
                </tbody>
            </table>
        </div>

        <div class="totals">
            <p><strong>{{ $data['subTotalLabel'] ?? 'Subtotal' }}:</strong> {{ $data['currency'] ?? '$' }}{{ number_format($data['_calculatedSubTotal'] ?? 0, 2) }}</p>
            <p><strong>Tax ({{ number_format($data['taxRate'] ?? 0, 1) }}%):</strong> {{ $data['currency'] ?? '$' }}{{ number_format($data['_calculatedTax'] ?? 0, 2) }}</p>
            <p><strong>{{ $data['totalLabel'] ?? 'Total' }}:</strong> {{ $data['currency'] ?? '$' }}{{ number_format($data['_calculatedTotal'] ?? 0, 2) }}</p>
        </div>

        @if(isset($data['notes']))
            <div class="notes">
                <h3>{{ $data['notesLabel'] ?? 'Notes' }}</h3>
                <p>{{ $data['notes'] }}</p>
            </div>
        @endif

        @if(isset($data['term']))
            <div class="terms">
                <h3>{{ $data['termLabel'] ?? 'Terms & Conditions' }}</h3>
                <p>{{ $data['term'] }}</p>
            </div>
        @endif
    </div>
</body>
</html>
