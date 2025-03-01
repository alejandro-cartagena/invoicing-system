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
    </style>
</head>
<body>
    {{-- We'll use your existing InvoicePage component's structure here --}}
    @include('components.invoice', ['data' => $data, 'pdfMode' => true])
</body>
</html>
