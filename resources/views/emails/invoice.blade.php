<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Invoice from {{ $senderName }}</h2>
        
        <p>Hello,</p>
        
        <p>Please find attached the invoice from {{ $senderName }}.</p>
        
        <p>Invoice Details:</p>
        <ul>
            <li>Invoice Number: {{ $invoiceData['invoiceTitle'] ?? 'N/A' }}</li>
            <li>Amount: {{ $invoiceData['currency'] ?? '$' }}{{ isset($invoiceData['total']) ? number_format($invoiceData['total'], 2) : '0.00' }}</li>
        </ul>

        <p>If you have any questions, please reply to this email.</p>
        
        <p>Best regards,<br>{{ $senderName }}</p>
    </div>
</body>
</html>
