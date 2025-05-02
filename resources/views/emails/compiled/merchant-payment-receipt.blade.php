<!doctype html>
<html lang="und" dir="auto" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">

<head>
  <title>Payment Received</title>
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--<![endif]-->
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style type="text/css">
    #outlook a {
      padding: 0;
    }

    body {
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    table,
    td {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }

    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }

    p {
      display: block;
      margin: 13px 0;
    }

  </style>
  <!--[if mso]>
    <noscript>
    <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    </noscript>
    <![endif]-->
  <!--[if lte mso 11]>
    <style type="text/css">
      .mj-outlook-group-fix { width:100% !important; }
    </style>
    <![endif]-->
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css?family=Helvetica" rel="stylesheet" type="text/css">
  <style type="text/css">
    @import url(https://fonts.googleapis.com/css?family=Helvetica);

  </style>
  <!--<![endif]-->
  <style type="text/css">
    @media only screen and (min-width:480px) {
      .mj-column-per-100 {
        width: 100% !important;
        max-width: 100%;
      }
    }

  </style>
  <style media="screen and (min-width:480px)">
    .moz-text-html .mj-column-per-100 {
      width: 100% !important;
      max-width: 100%;
    }

  </style>
  <style type="text/css">
    @media screen and (max-width: 480px) {
      .desktop-only {
        display: none !important;
      }

      .mobile-only {
        display: block !important;
      }
    }

    @media screen and (min-width: 481px) {
      .desktop-only {
        display: block !important;
      }

      .mobile-only {
        display: none !important;
      }
    }

  </style>
</head>

<body style="word-spacing:normal;background-color:#f4f4f4;">
  <div style="background-color:#f4f4f4;" lang="und" dir="auto">
    <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="" role="presentation" style="width:600px;" width="600" bgcolor="#ffffff" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
    <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:600px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;">
        <tbody>
          <tr>
            <td style="direction:ltr;font-size:0px;padding:20px;text-align:center;">
              <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:560px;" ><![endif]-->
              <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                  <tbody>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:Helvetica, Arial, sans-serif;font-size:28px;font-weight:bold;line-height:1;text-align:left;color:#333333;">Payment Received</div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:1;text-align:left;color:#000000;">You have received a new payment from {{ $invoice->client_email }}.</div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:1;text-align:left;color:#000000;">Here are the payment details:</div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <p style="border-top:solid 4px #eeeeee;font-size:1px;margin:0px auto;width:100%;">
                        </p>
                        <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" style="border-top:solid 4px #eeeeee;font-size:1px;margin:0px auto;width:510px;" role="presentation" width="510px" ><tr><td style="height:0;line-height:0;"> &nbsp;
</td></tr></table><![endif]-->
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:Helvetica, Arial, sans-serif;font-size:18px;font-weight:bold;line-height:1;text-align:left;color:#000000;">Payment Details:</div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:1;text-align:left;color:#000000;">Invoice Number: {{ $invoice->nmi_invoice_id }}<br /> Amount Received: ${{ number_format($invoice->total, 2) }}</div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <p style="border-top:solid 4px #eeeeee;font-size:1px;margin:0px auto;width:100%;">
                        </p>
                        <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" style="border-top:solid 4px #eeeeee;font-size:1px;margin:0px auto;width:510px;" role="presentation" width="510px" ><tr><td style="height:0;line-height:0;"> &nbsp;
</td></tr></table><![endif]-->
                      </td>
                    </tr>
                    <!-- Desktop Table -->
                    <tr>
                      <td class="desktop-only" style="font-size:0px;padding:10px;word-break:break-word;">
                        <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="desktop-only-outlook" role="presentation" style="width:560px;" width="560" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
                        <div class="desktop-only" style="margin:0px auto;max-width:560px;">
                          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                            <tbody>
                              <tr>
                                <td style="direction:ltr;font-size:0px;padding:10px;text-align:center;">
                                  <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td align="left" class="desktop-table-outlook" width="560px" ><![endif]-->
                                  <table cellpadding="0" cellspacing="0" width="100%" border="0" style="color:#000000;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:22px;table-layout:auto;width:100%;border:none;">
                                    <tr style="border-bottom:1px solid #ecedee;text-align:left;">
                                      <th>Description</th>
                                      <th>Quantity</th>
                                      <th>Rate</th>
                                      <th>Amount</th>
                                    </tr> @foreach($invoiceData['productLines'] as $item) @if(isset($item['description']) && $item['description']) <tr>
                                      <td style="text-align:left;">{{ $item['description'] }}</td>
                                      <td style="text-align:left;">{{ $item['quantity'] ?? '0' }}</td>
                                      <td style="text-align:left;">{{ $invoiceData['currency'] ?? '$' }}{{ $item['rate'] ?? '0.00' }}</td>
                                      <td style="text-align:left;">{{ $invoiceData['currency'] ?? '$' }}{{ number_format(($item['quantity'] ?? 0) * ($item['rate'] ?? 0), 2) }}</td>
                                    </tr> @endif @endforeach
                                  </table>
                                  <!--[if mso | IE]></td></tr></table><![endif]-->
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <!--[if mso | IE]></td></tr></table><![endif]-->
                      </td>
                    </tr>
                    <!-- Mobile Layout -->
                    <tr>
                      <td class="mobile-only" style="font-size:0px;padding:10px;word-break:break-word;">
                        <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="mobile-only-outlook" role="presentation" style="width:560px;" width="560" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
                        <div class="mobile-only" style="margin:0px auto;max-width:560px;">
                          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                            <tbody>
                              <tr>
                                @foreach($invoiceData['productLines'] as $item) @if(isset($item['description']) && $item['description'])
                                <td style="direction:ltr;font-size:0px;padding:10px;text-align:center;">
                                  <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td align="left" class="" width="560px" ><![endif]-->
                                  <div style="font-family:Helvetica, Arial, sans-serif;font-size:18px;font-weight:bold;line-height:1;text-align:left;color:#000000;">Invoice Items:</div>
                                  <!--[if mso | IE]></td></tr><tr><td align="left" class="" width="560px" ><![endif]-->
                                  <div style="font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:1;text-align:left;color:#000000;"><strong>Description:</strong><br />
                                    {{ $item['description'] }}<br /><br />
                                    <strong>Quantity:</strong><br />
                                    {{ $item['quantity'] ?? '0' }}<br /><br />
                                    <strong>Rate:</strong><br />
                                    {{ $invoiceData['currency'] ?? '$' }}{{ $item['rate'] ?? '0.00' }}<br /><br />
                                    <strong>Amount:</strong><br />
                                    {{ $invoiceData['currency'] ?? '$' }}{{ number_format(($item['quantity'] ?? 0) * ($item['rate'] ?? 0), 2) }}
                                  </div>
                                  <!--[if mso | IE]></td></tr><tr><td align="center" class="mobile-only-outlook" width="560px" ><![endif]-->
                                  <p style="border-top:dashed 4px #ecedee;font-size:1px;margin:0px auto;width:100%;">
                                  </p>
                                  <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" style="border-top:solid 4px #ecedee;font-size:1px;margin:0px auto;width:490px;" role="presentation" width="490px" ><tr><td style="height:0;line-height:0;"> &nbsp;
</td></tr></table></td></tr></table><![endif]-->
                                </td>
                              </tr>
                              @endif @endforeach
                            </tbody>
                          </table>
                        </div>
                        <!--[if mso | IE]></td></tr></table><![endif]-->
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <p style="border-top:solid 4px #eeeeee;font-size:1px;margin:0px auto;width:100%;">
                        </p>
                        <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" style="border-top:solid 4px #eeeeee;font-size:1px;margin:0px auto;width:510px;" role="presentation" width="510px" ><tr><td style="height:0;line-height:0;"> &nbsp;
</td></tr></table><![endif]-->
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:1;text-align:left;color:#000000;">This payment has been processed and added to your account.</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <!--[if mso | IE]></td></tr></table><![endif]-->
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!--[if mso | IE]></td></tr></table><![endif]-->
  </div>
</body>

</html>
