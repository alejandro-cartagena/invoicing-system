import { useState, useEffect } from 'react'
import { initialInvoice, initialProductLine } from '../../data/initialData'
import EditableInput from './EditableInput'
import EditableSelect from './EditableSelect'
import EditableTextarea from './EditableTextarea'
import EditableCalendarInput from './EditableCalendarInput'
import EditableFileImage from './EditableFileImage'
import countryList from '../../data/countryList'
import statesList from '../../data/statesList'
import Document from './Document'
import Page from './Page'
import View from './View'
import Text from './Text'
import { Font } from '@react-pdf/renderer'
import Download from './DownloadPDF'
import { format } from 'date-fns/format'


Font.register({
  family: 'Nunito',
  src: 'https://fonts.gstatic.com/s/nunito/v12/XRXV3I6Li01BKofINeaE.ttf',
  fontWeight: 'normal',
})
Font.register({
  family: 'Nunito',
      src: 'https://fonts.gstatic.com/s/nunito/v12/XRXW3I6Li01BKofA6sKUYevN.ttf',
  fontWeight: 'bold',
})

const getClasses = (pdfClasses, responsiveClasses, pdfMode) => {
    return pdfMode ? pdfClasses : responsiveClasses;
};

const InvoicePage = ({ data, pdfMode, onChange }) => {
  const [invoice, setInvoice] = useState(data ? { ...data } : { ...initialInvoice })
  
  // Calculate values directly for PDF mode to avoid state timing issues
  const calculateSubTotal = () => {
    let total = 0;
    
    if (invoice && invoice.productLines && Array.isArray(invoice.productLines)) {
      invoice.productLines.forEach((line) => {
        if (line && typeof line === 'object') {
          const quantity = parseFloat(line.quantity || 0);
          const rate = parseFloat(line.rate || 0);
          if (!isNaN(quantity) && !isNaN(rate)) {
            total += quantity * rate;
          }
        }
      });
    }
    
    return total;
  }

  const calculateTax = (subTotal) => {
    let taxRate = 0;
    
    if (invoice && invoice.taxRate && !isNaN(parseFloat(invoice.taxRate))) {
      taxRate = parseFloat(invoice.taxRate);
    }
    
    return !isNaN(subTotal) && !isNaN(taxRate) ? (subTotal * taxRate / 100) : 0;
  }

  // For non-PDF mode, we'll still use state for reactivity
  const [subTotal, setSubTotal] = useState(calculateSubTotal())
  const [saleTax, setSaleTax] = useState(calculateTax(subTotal))

  const dateFormat = 'MMM dd, yyyy'
  const invoiceDate = invoice.invoiceDate 
    ? new Date(invoice.invoiceDate) 
    : new Date();

  const invoiceDueDate = invoice.invoiceDueDate 
      ? new Date(invoice.invoiceDueDate)
    : (() => {
        const date = new Date(invoiceDate);
        date.setDate(date.getDate() + 30);
        return date;
      })();

  const handleChange = (name, value) => {
    if (name !== 'productLines') {
      const newInvoice = { ...invoice }

      if (name === 'logoWidth' && typeof value === 'number') {
        newInvoice[name] = value
      } else if (name !== 'logoWidth' && typeof value === 'string') {
        newInvoice[name] = value
        
        // Special handling for firstName and lastName to update clientName
        if (name === 'firstName' || name === 'lastName') {
          const firstName = name === 'firstName' ? value : newInvoice.firstName || '';
          const lastName = name === 'lastName' ? value : newInvoice.lastName || '';
          // Only update clientName if it was empty or matched the previous first+last name combination
          const previousFullName = `${newInvoice.firstName || ''} ${newInvoice.lastName || ''}`.trim();
          if (!newInvoice.clientName || newInvoice.clientName === previousFullName) {
            newInvoice.clientName = `${firstName} ${lastName}`.trim();
          }
        }
      }

      setInvoice(newInvoice)
    }
  }

  const handleProductLineChange = (index, name, value) => {
    const productLines = invoice.productLines.map((productLine, i) => {
      if (i === index) {
        const newProductLine = { ...productLine }

        if (name === 'description') {
          newProductLine[name] = value
        } else {
          if (
            value[value.length - 1] === '.' ||
            (value[value.length - 1] === '0' && value.includes('.'))
          ) {
            newProductLine[name] = value
          } else {
            const n = parseFloat(value)

            newProductLine[name] = (n ? n : 0).toString()
          }
        }

        return newProductLine
      }

      return { ...productLine }
    })
    setInvoice({ ...invoice, productLines })
  }

  const handleRemove = (i) => {
    const productLines = invoice.productLines.filter((_, index) => index !== i)
    setInvoice({ ...invoice, productLines })
  }

  const handleAdd = () => {
    const productLines = [...invoice.productLines, { ...initialProductLine }]
    setInvoice({ ...invoice, productLines })
  }

  const calculateAmount = (quantity, rate) => {
    const quantityNumber = parseFloat(quantity)
    const rateNumber = parseFloat(rate)
    const amount = quantityNumber && rateNumber ? quantityNumber * rateNumber : 0

    return amount.toFixed(2)
  }

  useEffect(() => {
    if (onChange) {
      onChange(invoice)
    }
  }, [onChange, invoice])


  // Add these useEffect hooks to update the subtotal and tax when product lines change
  useEffect(() => {
    const newSubTotal = calculateSubTotal();
    setSubTotal(newSubTotal);
    
    // Recalculate tax when subtotal changes
    const taxRate = invoice.taxRate ? parseFloat(invoice.taxRate) : 0;
    const newTaxAmount = newSubTotal * (taxRate / 100);
    setSaleTax(newTaxAmount);
  }, [invoice.productLines]);

  useEffect(() => {
    // Update tax when tax rate changes
    const taxRate = invoice.taxRate ? parseFloat(invoice.taxRate) : 0;
    const newTaxAmount = subTotal * (taxRate / 100);
    setSaleTax(newTaxAmount);
  }, [invoice.taxRate, subTotal]);

  // When in PDF mode, calculate values directly instead of relying on state
  const pdfSubTotal = pdfMode ? calculateSubTotal() : subTotal
  const pdfSaleTax = pdfMode ? calculateTax(pdfSubTotal) : saleTax
  const pdfTotal = pdfSubTotal + pdfSaleTax

  useEffect(() => {
    // Set default dates for new invoices
    if (invoice.invoiceDate === '' || invoice.invoiceDueDate === '') {
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 30); // Due date is 30 days from today
      
      const formattedToday = format(today, dateFormat);
      const formattedDueDate = format(dueDate, dateFormat);
      
      setInvoice(prev => ({
        ...prev,
        invoiceDate: prev.invoiceDate || formattedToday,
        invoiceDueDate: prev.invoiceDueDate || formattedDueDate
      }));
    }
  }, []);

  useEffect(() => {
    // Extract tax rate from taxLabel if it exists
    if (invoice.taxLabel && !invoice.taxRate) {
      const match = invoice.taxLabel.match(/(\d+)/);
      if (match && match[1]) {
        const taxRate = match[1];
        setInvoice(prev => ({
          ...prev,
          taxRate: taxRate
        }));
      }
    }
  }, []);


  return (
    <Document pdfMode={pdfMode}>
      <Page className="relative bg-white p-9 shadow-md" pdfMode={pdfMode}>
        {!pdfMode && <Download data={invoice} setData={(d) => setInvoice(d)} />}

        <View 
            className={getClasses(
              "flex", // PDF classes 
              "flex flex-col-reverse md:flex-row", 
              pdfMode
            )} 
            pdfMode={pdfMode}
        >
          <View 
            className={getClasses(
              "w-1/2", // PDF classes
              "w-full flex flex-col gap-2 md:w-1/2", // Responsive classes
              pdfMode
          )} 
          pdfMode={pdfMode}
          >
            <EditableFileImage
              className="logo"
              placeholder="Your Logo"
              value={invoice.logo}
              width={invoice.logoWidth}
              pdfMode={pdfMode}
              onChangeImage={(value) => handleChange('logo', value)}
              onChangeWidth={(value) => handleChange('logoWidth', value)}
            />
            <EditableInput
              className="text-xl font-semibold border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
              placeholder="Your Company"
              value={invoice.companyName}
              onChange={(value) => handleChange('companyName', value)}
              pdfMode={pdfMode}
            />
            <EditableInput
              className="border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
              placeholder="Your Name"
              value={invoice.name}
              onChange={(value) => handleChange('name', value)}
              pdfMode={pdfMode}
            />
            <EditableInput
              className="border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
              placeholder="Company's Address"
              value={invoice.companyAddress}
              onChange={(value) => handleChange('companyAddress', value)}
              pdfMode={pdfMode}
            />
            <EditableInput
              className="border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
              placeholder="City, State Zip"
              value={invoice.companyAddress2}
              onChange={(value) => handleChange('companyAddress2', value)}
              pdfMode={pdfMode}
            />
            <EditableSelect
              className="border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
              options={countryList}
              value={invoice.companyCountry}
              onChange={(value) => handleChange('companyCountry', value)}
              pdfMode={pdfMode}
            />
          </View>
          <View
            className={getClasses(
              "w-full", // PDF classes
              "w-full md:w-1/2", // Responsive classes
              pdfMode
            )} 
            pdfMode={pdfMode}
          >
            <EditableInput
              className="text-5xl md:text-right font-semibold"
              placeholder="Invoice"
              value={invoice.title}
              onChange={(value) => handleChange('title', value)}
              pdfMode={pdfMode}
            />
          </View>
        </View>

        <View className={getClasses(
              "flex mt-20 justify-between items-center", // PDF classes - added justify-between and specific margin
              "flex flex-col md:justify-between md:flex-row mt-[40px] items-center", // Responsive classes
              pdfMode
            )} 
            pdfMode={pdfMode}
          >
          <View className={getClasses(
              "w-[48%]", // PDF classes - adjusted width to prevent overlap
              "w-full mb-10 md:mb-0 md:w-[50%] flex flex-col gap-2", 
              pdfMode
            )} 
            pdfMode={pdfMode}
          >
            <Text
              className="text-xl font-semibold dark mb-[5px]"
              pdfMode={pdfMode}
            >
              {invoice.billTo || "Bill To"}
            </Text>
            
            {/* First Name and Last Name fields */}
            {pdfMode ? (
              // PDF mode: Show concatenated name
              <View className="flex flex-row gap-2" pdfMode={pdfMode}>
                <Text className="" pdfMode={pdfMode}>
                  {`${invoice.firstName || ''} ${invoice.lastName || ''}`.trim()}
                </Text>
              </View>
            ) : (
              // Web mode: Show separate input fields
              <View className="flex flex-row gap-2" pdfMode={pdfMode}>
                <View className="w-1/2" pdfMode={pdfMode}>
                  <EditableInput
                    className="border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
                    placeholder="First Name"
                    value={invoice.firstName || ''}
                    onChange={(value) => handleChange('firstName', value)}
                    pdfMode={pdfMode}
                  />
                </View>
                <View className="w-1/2" pdfMode={pdfMode}>
                  <EditableInput
                    className="border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
                    placeholder="Last Name"
                    value={invoice.lastName || ''}
                    onChange={(value) => handleChange('lastName', value)}
              pdfMode={pdfMode}
            />
                </View>
              </View>
            )}
            
            {/* Client's business/company name (optional) */}
            <EditableInput
              className="border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
              placeholder="Company Name (optional)"
              value={invoice.clientName}
              onChange={(value) => handleChange('clientName', value)}
              pdfMode={pdfMode}
            />
            
            {/* Address */}
            <EditableInput
              className="border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
              placeholder="Address Line 1"
              value={invoice.clientAddress}
              onChange={(value) => handleChange('clientAddress', value)}
              pdfMode={pdfMode}
            />
            
            {/* City, State, Zip row */}
            <View className="flex flex-row gap-2" pdfMode={pdfMode}>
              <View className="w-1/3" pdfMode={pdfMode}>
                <EditableInput
                  className="border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
                  placeholder="City"
                  value={invoice.city || ''}
                  onChange={(value) => handleChange('city', value)}
                  pdfMode={pdfMode}
                />
              </View>
              <View className="w-1/3" pdfMode={pdfMode}>
                <EditableSelect
                  className="border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
                  options={statesList}
                  value={invoice.state || 'AL'}
                  onChange={(value) => handleChange('state', value)}
                  pdfMode={pdfMode}
                />
              </View>
              <View className="w-1/3" pdfMode={pdfMode}>
            <EditableInput
                  className="border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
                  placeholder="Zip"
                  value={invoice.zip || ''}
                  onChange={(value) => handleChange('zip', value)}
              pdfMode={pdfMode}
            />
              </View>
            </View>
            
            {/* Country */}
            <EditableSelect
              className="border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
              options={countryList}
              value={invoice.country || invoice.clientCountry || ''}
              onChange={(value) => handleChange('country', value)}
              pdfMode={pdfMode}
            />
          </View>
          <View className={getClasses(
              "w-[48%]", // PDF classes - adjusted width to prevent overlap
              "w-full md:w-[45%]",
              pdfMode
            )} 
            pdfMode={pdfMode}
          >
            <View 
            className={getClasses(
              "flex mb-[5px]", // PDF classes
              "flex flex-col md:flex-row mb-[5px]", // Responsive classes
              pdfMode
            )} 
            pdfMode={pdfMode}
            >
              <View className="w-[40%]" pdfMode={pdfMode}>
                <Text
                  className="font-semibold text-base"
                  pdfMode={pdfMode}
                >
                  {invoice.invoiceTitleLabel || "Invoice #"}
                </Text>
              </View>
              <View 
                className={getClasses(
                  "w-[60%]", // PDF classes
                  "w-full md:w-[60%]", // Responsive classes
                  pdfMode
                )} 
                pdfMode={pdfMode}
              >
                <EditableInput
                  className="border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
                  placeholder="INV-12"
                  value={invoice.invoiceTitle}
                  onChange={(value) => handleChange('invoiceTitle', value)}
                  pdfMode={pdfMode}
                />
              </View>
            </View>
            <View className={getClasses(
              "flex mb-[5px]", // PDF classes
              "flex flex-col md:flex-row mb-[5px]", // Responsive classes
              pdfMode
            )} 
            pdfMode={pdfMode}
            >
              <View className="w-[40%]" pdfMode={pdfMode}>
                <Text
                  className="font-semibold text-base"
                  pdfMode={pdfMode}
                >
                  {invoice.invoiceDateLabel || "Invoice Date"}
                </Text>
              </View>
              <View className="w-[60%]" pdfMode={pdfMode}>
                <EditableCalendarInput
                  className="border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
                  value={format(invoiceDate, dateFormat)}
                  selected={invoiceDate}
                  onChange={(date) =>
                    handleChange(
                      'invoiceDate',
                      date && !Array.isArray(date) ? format(date, dateFormat) : '',
                    )
                  }
                  pdfMode={pdfMode}
                />
              </View>
            </View>
            <View className={getClasses(
              "flex mb-[5px]", // PDF classes
              "flex flex-col md:flex-row mb-[5px]", // Responsive classes
              pdfMode
            )} 
            pdfMode={pdfMode}
            >
              <View className="w-[40%]" pdfMode={pdfMode}>
                <Text
                  className="font-semibold text-base"
                  pdfMode={pdfMode}
                >
                  {invoice.invoiceDueDateLabel || "Due Date"}
                </Text>
              </View>
              <View className="w-[60%]" pdfMode={pdfMode}>
                <EditableCalendarInput
                  className="border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
                  value={format(invoiceDueDate, dateFormat)}
                  selected={invoiceDueDate}
                  onChange={(date) =>
                    handleChange(
                      'invoiceDueDate',
                      date ? (!Array.isArray(date) ? format(date, dateFormat) : '') : '',
                    )
                  }
                  pdfMode={pdfMode}
                />
              </View>
            </View>
          </View>
        </View>

        <div className='md:overflow-x-visible md:whitespace-normal overflow-x-auto whitespace-nowrap'>
          <View className="mt-[30px] bg-[#555] flex min-w-[500px]" pdfMode={pdfMode}>
            <View className="w-[48%] px-2 py-1" pdfMode={pdfMode}>
              <Text
                className="text-white bg-[#555] font-bold"
              pdfMode={pdfMode}
              >
                {invoice.productLineDescription || "Item Description"}
              </Text>
            </View>
            <View className="w-[17%] px-2 py-1" pdfMode={pdfMode}>
              <Text
                className="text-white bg-[#555] font-bold text-right"
              pdfMode={pdfMode}
              >
                {invoice.productLineQuantity || "Qty"}
              </Text>
            </View>
            <View className="w-[17%] px-2 py-1" pdfMode={pdfMode}>
              <Text
                className="text-white bg-[#555] font-bold text-right"
              pdfMode={pdfMode}
              >
                {invoice.productLineQuantityCost || "Cost"}
              </Text>
            </View>
            <View className="w-[18%] px-2 py-1" pdfMode={pdfMode}>
              <Text
                className="text-white bg-[#555] font-bold text-right"
              pdfMode={pdfMode}
              >
                {invoice.productLineQuantityTotal || "Total"}
              </Text>
            </View>
        </View>

        {invoice.productLines.map((productLine, i) => {
          return pdfMode && productLine.description === '' ? (
            <Text key={i}></Text>
          ) : (
              <View key={i} className="row flex min-w-[500px]" pdfMode={pdfMode}>
                <View className="w-[48%] px-2 py-1" pdfMode={pdfMode}>
                  <EditableTextarea
                    className="text-gray-800 border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
                    rows={2}
                    placeholder="Enter item name/description"
                    value={productLine.description}
                    onChange={(value) => handleProductLineChange(i, 'description', value)}
                    pdfMode={pdfMode}
                  />
                </View>
                <View className="w-[17%] px-2 py-1" pdfMode={pdfMode}>
                  <EditableInput
                    className="dark text-right border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
                    value={productLine.quantity}
                    onChange={(value) => handleProductLineChange(i, 'quantity', value)}
                    pdfMode={pdfMode}
                  />
                </View>
                <View className="w-[17%] px-2 py-1" pdfMode={pdfMode}>
                  <EditableInput
                    className="dark text-right border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400"
                    value={productLine.rate}
                    onChange={(value) => handleProductLineChange(i, 'rate', value)}
                    pdfMode={pdfMode}
                  />
                </View>
                <View className="w-[18%] px-2 py-1" pdfMode={pdfMode}>
                  <Text className="dark text-right" pdfMode={pdfMode}>
                    {calculateAmount(productLine.quantity, productLine.rate)}
                  </Text>
                </View>
                {!pdfMode && (
                  <button
                      className="link row__remove opacity-100 md:opacity-0"
                    aria-label="Remove Row"
                    title="Remove Row"
                    onClick={() => handleRemove(i)}
                  >
                      <span className="icon icon-remove bg-red-500"></span>
                  </button>
                )}
              </View>
            )
          })}
        </div>

        <View 
        className={getClasses(
          "flex", // PDF classes
          "flex flex-col md:flex-row", // Responsive classes
          pdfMode
        )} 
        pdfMode={pdfMode}
        >
          <View 
          className={getClasses(
            "w-[50%] mt-[10px]", // PDF classes
            "w-full md:w-[50%] mt-[10px]", // Responsive classes
            pdfMode
          )} 
          pdfMode={pdfMode}
          >
            {!pdfMode && (
              <button className="link" onClick={handleAdd}>
                <span className="icon icon-add bg-green-500 mr-[10px]"></span>
                Add Line Item
              </button>
            )}
          </View>
          <View 
          className={getClasses(
            "w-[50%] mt-[20px]", // PDF classes
            "w-full md:w-[50%] mt-[20px]", // Responsive classes
            pdfMode
          )} 
          pdfMode={pdfMode}
          >
            <View className="flex" pdfMode={pdfMode}>
              <View className="w-[50%] p-[5px]" pdfMode={pdfMode}>
                <Text className="text-base dark" pdfMode={pdfMode}>
                  {invoice.subTotalLabel}
                </Text>
              </View>
              <View className="w-[50%] p-[5px]" pdfMode={pdfMode}>
                <Text className="text-right font-semibold dark" pdfMode={pdfMode}>
                  {pdfMode && data && data._calculatedSubTotal !== undefined 
                    ? data._calculatedSubTotal.toFixed(2) 
                    : pdfSubTotal.toFixed(2)}
                </Text>
              </View>
            </View>
            <View className="flex" pdfMode={pdfMode}>
              <View className="w-[50%] p-[5px]" pdfMode={pdfMode}>
                <Text className="text-base dark" pdfMode={pdfMode}>
                  {"Sales Tax (" + invoice.taxRate + "%)"}
                </Text>
                <EditableInput
                    className={getClasses(
                      "w-12 text-right mx-1 text-gray-800 font-semibold text-md",
                      "w-12 text-right mx-1 border-2 border-solid border-gray-200 rounded px-1 hover:border-gray-300 focus:border-gray-400",
                      pdfMode
                    )}
                    hidden={pdfMode}
                    value={invoice.taxRate || ""}
                    onChange={(value) => {
                        // Only allow numbers and decimal point
                        const numericValue = value.replace(/[^0-9.]/g, '');
                        
                        // Remove leading zeros unless it's just "0"
                        const cleanValue = numericValue.replace(/^0+(?=\d)/, '');
                        
                        // Handle empty value
                        if (!cleanValue) {
                            handleChange('taxLabel', 'Tax (0%)');
                            handleChange('taxRate', '0');
                            setSaleTax(0);
                            return;
                        }
                        
                        // Update tax label with the new percentage
                        handleChange('taxLabel', `Tax (${cleanValue}%)`);
                        // Also store the raw percentage value
                        handleChange('taxRate', cleanValue);
                        
                        // Force recalculation of tax immediately
                        const newTaxAmount = calculateSubTotal() * (parseFloat(cleanValue) / 100);
                        setSaleTax(newTaxAmount);
                    }}
                  />
              </View>
              <View className="w-[50%] p-[5px]" pdfMode={pdfMode}>
                <Text className="text-right font-semibold dark" pdfMode={pdfMode}>
                  {pdfMode && data && data._calculatedTax !== undefined 
                    ? data._calculatedTax.toFixed(2) 
                    : pdfSaleTax.toFixed(2)}
                </Text>
              </View>
            </View>
            <View className="flex bg-[#e3e3e3] p-[5px]" pdfMode={pdfMode}>
              <View 
                className={getClasses(
                  "w-[50%] p-[5px]", // PDF classes
                  "w-[30%] md:w-[50%] p-[5px]", // Responsive classes
                  pdfMode
                )} 
                pdfMode={pdfMode}
              >
                <Text
                  className="text-gray-800 font-semibold bg-[#e3e3e3]"
                  pdfMode={pdfMode}
                >
                  {invoice.totalLabel || "Total"}
                </Text>
              </View>
              <View 
                className={getClasses(
                  "w-[50%] p-[5px] flex", // PDF classes
                  "w-[70%] md:w-[50%] p-[5px] flex", // Responsive classes
                  pdfMode
                )} 
                pdfMode={pdfMode}
              >
                <EditableInput
                  className="text-gray-800 font-bold text-right ml-[30px] bg-[#e3e3e3]"
                  value={invoice.currency}
                  onChange={(value) => handleChange('currency', value)}
                  pdfMode={pdfMode}
                />
                <Text className="text-gray-800 text-right font-bold bg-[#e3e3e3] w-auto" pdfMode={pdfMode}>
                  {pdfMode && data && data._calculatedTotal !== undefined 
                    ? data._calculatedTotal.toFixed(2)
                    : pdfTotal.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mt-[20px]" pdfMode={pdfMode}>
          <EditableInput
            className="font-semibold w-[100%]"
            value={invoice.notesLabel}
            onChange={(value) => handleChange('notesLabel', value)}
            pdfMode={pdfMode}
          />
          <EditableTextarea
            className="w-[100%]"
            rows={2}
            value={invoice.notes}
            onChange={(value) => handleChange('notes', value)}
            pdfMode={pdfMode}
          />
        </View>
        <View className="mt-[20px]" pdfMode={pdfMode}>
          <EditableInput
            className="font-semibold w-[100%]"
            value={invoice.termLabel}
            onChange={(value) => handleChange('termLabel', value)}
            pdfMode={pdfMode}
          />
          <EditableTextarea
            className="w-[100%]"
            rows={2}
            value={invoice.term}
            onChange={(value) => handleChange('term', value)}
            pdfMode={pdfMode}
          />
        </View>
      </Page>
    </Document>
  )
}

export default InvoicePage

// Next Steps:
// 1. Create a new Laravel Mailable:
//    - InvoiceMail.php with PDF attachment
//    - Custom email template

// 2. Create a new API endpoint:
//    - InvoiceController@sendEmail
//    - Validation for email address
//    - PDF generation logic
//    - Email sending logic

// 3. Add Frontend components:
//    - Email input & send button
//    - Loading states
//    - Success/error notifications
//    - Form validation

