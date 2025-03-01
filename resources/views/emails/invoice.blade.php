<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        .header {
            margin-bottom: 20px;
        }
        .details {
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 0.9em;
            color: #666;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .items-table th, .items-table td {
            padding: 8px;
            border-bottom: 1px solid #eee;
            text-align: left;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Invoice from {{ $senderName }}</h2>
        </div>

        <p>Hello,</p>
        
        <p>Please find attached the invoice from {{ $senderName }}.</p>
        
        <div class="details">
            <p><strong>Invoice Details:</strong></p>
            <ul>
                <li>Invoice Number: {{ $invoiceData['invoiceTitle'] ?? 'Not specified' }}</li>
                <li>Date: {{ $invoiceData['invoiceDate'] ?? 'Not specified' }}</li>
                <li>Due Date: {{ $invoiceData['invoiceDueDate'] ?? 'Not specified' }}</li>
            </ul>

            @if(isset($invoiceData['productLines']) && is_array($invoiceData['productLines']))
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Rate</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($invoiceData['productLines'] as $item)
                            @if(isset($item['description']) && $item['description'])
                                <tr>
                                    <td>{{ $item['description'] }}</td>
                                    <td>{{ $item['quantity'] ?? '0' }}</td>
                                    <td>{{ $invoiceData['currency'] ?? '$' }}{{ $item['rate'] ?? '0.00' }}</td>
                                    <td>{{ $invoiceData['currency'] ?? '$' }}{{ number_format(($item['quantity'] ?? 0) * ($item['rate'] ?? 0), 2) }}</td>
                                </tr>
                            @endif
                        @endforeach
                    </tbody>
                </table>

                @php
                    $subTotal = collect($invoiceData['productLines'])
                        ->filter(fn($item) => isset($item['description']) && $item['description'])
                        ->sum(fn($item) => ($item['quantity'] ?? 0) * ($item['rate'] ?? 0));
                    
                    $taxRate = isset($invoiceData['taxLabel']) 
                        ? (int) filter_var($invoiceData['taxLabel'], FILTER_SANITIZE_NUMBER_INT) 
                        : 0;
                    
                    $tax = $subTotal * ($taxRate / 100);
                    $total = $subTotal + $tax;
                @endphp

                <p><strong>Sub Total:</strong> {{ $invoiceData['currency'] ?? '$' }}{{ number_format($subTotal, 2) }}</p>
                @if($taxRate > 0)
                    <p><strong>{{ $invoiceData['taxLabel'] ?? 'Tax' }}:</strong> {{ $invoiceData['currency'] ?? '$' }}{{ number_format($tax, 2) }}</p>
                @endif
                <p><strong>Total:</strong> {{ $invoiceData['currency'] ?? '$' }}{{ number_format($total, 2) }}</p>
            @endif
        </div>

        @if(isset($invoiceData['notes']) && $invoiceData['notes'])
            <div class="notes">
                <h3>{{ $invoiceData['notesLabel'] ?? 'Notes' }}</h3>
                <p>{{ $invoiceData['notes'] }}</p>
            </div>
        @endif

        @if(isset($invoiceData['term']) && $invoiceData['term'])
            <div class="terms">
                <h3>{{ $invoiceData['termLabel'] ?? 'Terms & Conditions' }}</h3>
                <p>{{ $invoiceData['term'] }}</p>
            </div>
        @endif

        <div class="footer">
            <p>Best regards,<br>{{ $senderName }}</p>
        </div>
    </div>
</body>
</html>
