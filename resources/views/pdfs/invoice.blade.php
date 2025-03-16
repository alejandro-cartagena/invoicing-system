<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice</title>
    <style>
        /* Add your PDF styles here */
        body {
            font-family: 'Nunito', sans-serif;
            color: #555;
            margin: 0;
            padding: 40px 35px;
        }
        .real-estate-section {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #eee;
            border-radius: 5px;
        }
        .real-estate-field {
            margin: 10px 0;
        }
        .field-label {
            font-weight: bold;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    {{-- Add this section before including the invoice component --}}
    @if(isset($data['invoice_type']) && $data['invoice_type'] === 'real_estate')
        <div class="real-estate-section">
            <h3>Real Estate Information</h3>
            <div class="real-estate-field">
                <span class="field-label">Property Address:</span>
                <span>{{ $data['propertyAddress'] ?? 'N/A' }}</span>
            </div>
            <div class="real-estate-field">
                <span class="field-label">Title Number:</span>
                <span>{{ $data['titleNumber'] ?? 'N/A' }}</span>
            </div>
            <div class="real-estate-field">
                <span class="field-label">Buyer Name:</span>
                <span>{{ $data['buyerName'] ?? 'N/A' }}</span>
            </div>
            <div class="real-estate-field">
                <span class="field-label">Seller Name:</span>
                <span>{{ $data['sellerName'] ?? 'N/A' }}</span>
            </div>
            <div class="real-estate-field">
                <span class="field-label">Real Estate Agent:</span>
                <span>{{ $data['agentName'] ?? 'N/A' }}</span>
            </div>
        </div>
    @endif

    {{-- Include the rest of the invoice --}}
    @include('components.invoice', ['data' => $data, 'pdfMode' => true])
</body>
</html>
