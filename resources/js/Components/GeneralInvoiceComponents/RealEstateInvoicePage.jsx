import { useState, useEffect } from 'react'
import { initialInvoice, initialProductLine } from '../../data/initialData'
import EditableInput from './EditableInput'
import EditableSelect from './EditableSelect'
import EditableTextarea from './EditableTextarea'
import EditableCalendarInput from './EditableCalendarInput'
import EditableFileImage from './EditableFileImage'
import countryList from '../../data/countryList'
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

const InvoicePage = ({ data, pdfMode, onChange }) => {
  const [invoice, setInvoice] = useState(data ? { ...data } : {
    ...initialInvoice,
    propertyAddress: '',
    titleNumber: '',
    buyerName: '',
    sellerName: '',
    agentName: ''
  })
  
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
    
    if (invoice && invoice.taxLabel) {
      const match = invoice.taxLabel.match(/(\d+)%/);
      if (match && match[1]) {
        taxRate = parseFloat(match[1]);
      }
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
  }, [invoice.productLines]);

  useEffect(() => {
    const newSaleTax = calculateTax(subTotal);
    setSaleTax(newSaleTax);
  }, [subTotal, invoice.taxLabel]);

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

  return (
    <Document pdfMode={pdfMode}>
      <Page className="relative bg-white p-9 shadow-md" pdfMode={pdfMode}>
        {!pdfMode && <Download data={invoice} setData={(d) => setInvoice(d)} />}

        <View className="flex" pdfMode={pdfMode}>
          <View className="w-1/2" pdfMode={pdfMode}>
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
              className="text-xl font-semibold"
              placeholder="Your Company"
              value={invoice.companyName}
              onChange={(value) => handleChange('companyName', value)}
              pdfMode={pdfMode}
            />
            <EditableInput
              placeholder="Your Name"
              value={invoice.name}
              onChange={(value) => handleChange('name', value)}
              pdfMode={pdfMode}
            />
            <EditableInput
              placeholder="Company's Address"
              value={invoice.companyAddress}
              onChange={(value) => handleChange('companyAddress', value)}
              pdfMode={pdfMode}
            />
            <EditableInput
              placeholder="City, State Zip"
              value={invoice.companyAddress2}
              onChange={(value) => handleChange('companyAddress2', value)}
              pdfMode={pdfMode}
            />
            <EditableSelect
              options={countryList}
              value={invoice.companyCountry}
              onChange={(value) => handleChange('companyCountry', value)}
              pdfMode={pdfMode}
            />
          </View>
          <View className="w-1/2" pdfMode={pdfMode}>
            <EditableInput
              className="text-5xl text-right font-semibold"
              placeholder="Invoice"
              value={invoice.title}
              onChange={(value) => handleChange('title', value)}
              pdfMode={pdfMode}
            />
          </View>
        </View>

        <View className="flex mt-[40px]" pdfMode={pdfMode}>
          <View className="w-[55%]" pdfMode={pdfMode}>
            <EditableInput
              className="text-xl font-semibold dark mb-[5px]"
              value={invoice.billTo}
              onChange={(value) => handleChange('billTo', value)}
              pdfMode={pdfMode}
              readOnly={true}
            />
            <EditableInput
              placeholder="Your Client's Name"
              value={invoice.clientName}
              onChange={(value) => handleChange('clientName', value)}
              pdfMode={pdfMode}
            />
            <EditableInput
              placeholder="Client's Address"
              value={invoice.clientAddress}
              onChange={(value) => handleChange('clientAddress', value)}
              pdfMode={pdfMode}
            />
            <EditableInput
              placeholder="City, State Zip"
              value={invoice.clientAddress2}
              onChange={(value) => handleChange('clientAddress2', value)}
              pdfMode={pdfMode}
            />
            <EditableSelect
              options={countryList}
              value={invoice.clientCountry}
              onChange={(value) => handleChange('clientCountry', value)}
              pdfMode={pdfMode}
            />
          </View>
          <View className="w-[45%]" pdfMode={pdfMode}>
            <View className="flex mb-[5px]" pdfMode={pdfMode}>
              <View className="w-[40%]" pdfMode={pdfMode}>
                <EditableInput
                  className="font-semibold"
                  value={invoice.invoiceTitleLabel}
                  onChange={(value) => handleChange('invoiceTitleLabel', value)}
                  pdfMode={pdfMode}
                  readOnly={true}
                />
              </View>
              <View className="w-[60%]" pdfMode={pdfMode}>
                <EditableInput
                  placeholder="INV-12"
                  value={invoice.invoiceTitle}
                  onChange={(value) => handleChange('invoiceTitle', value)}
                  pdfMode={pdfMode}
                />
              </View>
            </View>
            <View className="flex mb-[5px]" pdfMode={pdfMode}>
              <View className="w-[40%]" pdfMode={pdfMode}>
                <EditableInput
                  className="font-semibold"
                  value={invoice.invoiceDateLabel}
                  onChange={(value) => handleChange('invoiceDateLabel', value)}
                  pdfMode={pdfMode}
                  readOnly={true}
                />
              </View>
              <View className="w-[60%]" pdfMode={pdfMode}>
                <EditableCalendarInput
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
            <View className="flex mb-[5px]" pdfMode={pdfMode}>
              <View className="w-[40%]" pdfMode={pdfMode}>
                <EditableInput
                  className="font-semibold"
                  value={invoice.invoiceDueDateLabel}
                  onChange={(value) => handleChange('invoiceDueDateLabel', value)}
                  pdfMode={pdfMode}
                  readOnly={true}
                />
              </View>
              <View className="w-[60%]" pdfMode={pdfMode}>
                <EditableCalendarInput
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

        <View className="mt-[20px] mb-[20px]" pdfMode={pdfMode}>
            <Text className="font-semibold dark text-xl mb-[10px]" pdfMode={pdfMode}>
                Real Estate Information
            </Text>
            
            {/* Property Address */}
            <View className="mb-[10px]" pdfMode={pdfMode}>
                <View className="flex" pdfMode={pdfMode}>
                    <View className="w-[30%]" pdfMode={pdfMode}>
                        <EditableInput
                            className="font-semibold"
                            value="Property Address:"
                            pdfMode={pdfMode}
                            readOnly={true}
                        />
                    </View>
                    <View className="w-[70%]" pdfMode={pdfMode}>
                        <EditableInput
                            placeholder="Enter property address"
                            value={invoice.propertyAddress}
                            onChange={(value) => handleChange('propertyAddress', value)}
                            pdfMode={pdfMode}
                        />
                    </View>
                </View>
            </View>

            {/* Title Number */}
            <View className="mb-[10px]" pdfMode={pdfMode}>
                <View className="flex" pdfMode={pdfMode}>
                    <View className="w-[30%]" pdfMode={pdfMode}>
                        <EditableInput
                            className="font-semibold"
                            value="Title Number:"
                            pdfMode={pdfMode}
                            readOnly={true}
                        />
                    </View>
                    <View className="w-[70%]" pdfMode={pdfMode}>
                        <EditableInput
                            placeholder="Enter title number"
                            value={invoice.titleNumber}
                            onChange={(value) => handleChange('titleNumber', value)}
                            pdfMode={pdfMode}
                        />
                    </View>
                </View>
            </View>

            {/* Buyer Name */}
            <View className="mb-[10px]" pdfMode={pdfMode}>
                <View className="flex" pdfMode={pdfMode}>
                    <View className="w-[30%]" pdfMode={pdfMode}>
                        <EditableInput
                            className="font-semibold"
                            value="Buyer Name:"
                            pdfMode={pdfMode}
                            readOnly={true}
                        />
                    </View>
                    <View className="w-[70%]" pdfMode={pdfMode}>
                        <EditableInput
                            placeholder="Enter buyer's name"
                            value={invoice.buyerName}
                            onChange={(value) => handleChange('buyerName', value)}
                            pdfMode={pdfMode}
                        />
                    </View>
                </View>
            </View>

            {/* Seller Name */}
            <View className="mb-[10px]" pdfMode={pdfMode}>
                <View className="flex" pdfMode={pdfMode}>
                    <View className="w-[30%]" pdfMode={pdfMode}>
                        <EditableInput
                            className="font-semibold"
                            value="Seller Name:"
                            pdfMode={pdfMode}
                            readOnly={true}
                        />
                    </View>
                    <View className="w-[70%]" pdfMode={pdfMode}>
                        <EditableInput
                            placeholder="Enter seller's name"
                            value={invoice.sellerName}
                            onChange={(value) => handleChange('sellerName', value)}
                            pdfMode={pdfMode}
                        />
                    </View>
                </View>
            </View>

            {/* Real Estate Agent */}
            <View className="mb-[10px]" pdfMode={pdfMode}>
                <View className="flex" pdfMode={pdfMode}>
                    <View className="w-[30%]" pdfMode={pdfMode}>
                        <EditableInput
                            className="font-semibold"
                            value="Real Estate Agent:"
                            pdfMode={pdfMode}
                            readOnly={true}
                        />
                    </View>
                    <View className="w-[70%]" pdfMode={pdfMode}>
                        <EditableInput
                            placeholder="Enter agent's name"
                            value={invoice.agentName}
                            onChange={(value) => handleChange('agentName', value)}
                            pdfMode={pdfMode}
                        />
                    </View>
                </View>
            </View>
        </View>

        <View className="mt-[30px] bg-[#555] flex" pdfMode={pdfMode}>
          <View className="w-[48%] px-2 py-1" pdfMode={pdfMode}>
            <EditableInput
              className="text-white bg-[#555] font-bold"
              value={invoice.productLineDescription}
              onChange={(value) => handleChange('productLineDescription', value)}
              pdfMode={pdfMode}
            />
          </View>
          <View className="w-[17%] px-2 py-1" pdfMode={pdfMode}>
            <EditableInput
              className="text-white bg-[#555] font-bold text-right"
              value={invoice.productLineQuantity}
              onChange={(value) => handleChange('productLineQuantity', value)}
              pdfMode={pdfMode}
            />
          </View>
          <View className="w-[17%] px-2 py-1" pdfMode={pdfMode}>
            <EditableInput
              className="text-white bg-[#555] font-bold text-right"
              value={invoice.productLineQuantityCost}
              onChange={(value) => handleChange('productLineQuantityCost', value)}
              pdfMode={pdfMode}
            />
          </View>
          <View className="w-[18%] px-2 py-1" pdfMode={pdfMode}>
            <EditableInput
              className="text-white bg-[#555] font-bold text-right"
              value={invoice.productLineQuantityTotal}
              onChange={(value) => handleChange('productLineQuantityTotal', value)}
              pdfMode={pdfMode}
            />
          </View>
        </View>

        {invoice.productLines.map((productLine, i) => {
          return pdfMode && productLine.description === '' ? (
            <Text key={i}></Text>
          ) : (
            <View key={i} className="row flex" pdfMode={pdfMode}>
              <View className="w-[48%] px-2 py-1" pdfMode={pdfMode}>
                <EditableTextarea
                  className="text-gray-800"
                  rows={2}
                  placeholder="Enter item name/description"
                  value={productLine.description}
                  onChange={(value) => handleProductLineChange(i, 'description', value)}
                  pdfMode={pdfMode}
                />
              </View>
              <View className="w-[17%] px-2 py-1" pdfMode={pdfMode}>
                <EditableInput
                  className="dark text-right"
                  value={productLine.quantity}
                  onChange={(value) => handleProductLineChange(i, 'quantity', value)}
                  pdfMode={pdfMode}
                />
              </View>
              <View className="w-[17%] px-2 py-1" pdfMode={pdfMode}>
                <EditableInput
                  className="dark text-right"
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
                  className="link row__remove"
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

        <View className="flex" pdfMode={pdfMode}>
          <View className="w-[50%] mt-[10px]" pdfMode={pdfMode}>
            {!pdfMode && (
              <button className="link" onClick={handleAdd}>
                <span className="icon icon-add bg-green-500 mr-[10px]"></span>
                Add Line Item
              </button>
            )}
          </View>
          <View className="w-[50%] mt-[20px]" pdfMode={pdfMode}>
            <View className="flex" pdfMode={pdfMode}>
              <View className="w-[50%] p-[5px]" pdfMode={pdfMode}>
                <EditableInput
                  value={invoice.subTotalLabel}
                  onChange={(value) => handleChange('subTotalLabel', value)}
                  pdfMode={pdfMode}
                />
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
                <EditableInput
                  value={invoice.taxLabel}
                  onChange={(value) => handleChange('taxLabel', value)}
                  pdfMode={pdfMode}
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
              <View className="w-[50%] p-[5px]" pdfMode={pdfMode}>
                <EditableInput
                  className="text-gray-800 font-semibold bg-[#e3e3e3]"
                  value={invoice.totalLabel}
                  onChange={(value) => handleChange('totalLabel', value)}
                  pdfMode={pdfMode}
                />
              </View>
              <View className="w-[50%] p-[5px] flex" pdfMode={pdfMode}>
                <EditableInput
                  className="text-gray-800 font-bold text-right bg-[#e3e3e3]"
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

