import React from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { useDebounce } from '@uidotdev/usehooks'
import RealEstateInvoicePage from './RealEstateInvoicePage'
import { saveTemplate, handleTemplateUpload } from '@/utils/templateHandler'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload, faSave, faUpload } from '@fortawesome/free-solid-svg-icons'

const RealEstateDownload = ({ data, setData }) => {
  const debounced = useDebounce(data, 500)
  const title = data.invoiceTitle ? data.invoiceTitle.toLowerCase() : 'real-estate-invoice'

  function handleInput(e) {
    if (!e.target.files?.length) return
    handleTemplateUpload(e.target.files[0], setData)
  }

  function handleSaveTemplate() {
    saveTemplate(data)
  }


  return (

    <>
      {/* Mobile-only buttons */}
      <div className="md:hidden flex justify-center flex-wrap gap-4 my-8">
        {/* Download PDF Button - Using PDFDownloadLink */}
        <PDFDownloadLink
          key={JSON.stringify(debounced)}
          document={<RealEstateInvoicePage pdfMode={true} data={debounced} />}
          fileName={`${title}.pdf`}
          className="px-4 py-2 bg-green-500 text-white rounded-md text-sm md:text-base hover:bg-green-600 transition-all duration-300 flex items-center"
        >
          {({ loading }) => (
            <>
              <FontAwesomeIcon icon={faDownload} className="mr-2" />
              {loading ? 'Preparing PDF...' : 'Download PDF'}
            </>
          )}
        </PDFDownloadLink>

        {/* Save Template Button */}
        <button
          onClick={handleSaveTemplate}
          className="px-4 py-2 bg-indigo-500 text-white rounded-md text-sm md:text-base hover:bg-indigo-600 transition-all duration-300 flex items-center"
        >
          <FontAwesomeIcon icon={faSave} className="mr-2" />
          Save Template
        </button>

        {/* Upload Template Button */}
        <label className="px-4 py-2 bg-purple-500 text-white rounded-md text-sm md:text-base hover:bg-purple-600 transition-all duration-300 flex items-center cursor-pointer">
          <FontAwesomeIcon icon={faUpload} className="mr-2" />
          Upload Template
          <input
            type="file"
            accept=".json,.template"
            onChange={handleInput}
            className="sr-only"
          />
        </label>
      </div>
    
      {/* Desktop-only buttons */}
      <div className={'download-pdf '}>
        <PDFDownloadLink
          key={JSON.stringify(debounced)}
          document={<RealEstateInvoicePage pdfMode={true} data={debounced} />}
          fileName={`${title}.pdf`}
          aria-label="Save PDF"
          title="Save PDF"
          className="download-pdf__pdf bg-[url('/images/download.svg')] bg-no-repeat bg-center bg-contain"
        ></PDFDownloadLink>
        <p className="text-small mb-10">Save PDF</p>

        <button
          onClick={handleSaveTemplate}
          aria-label="Save Template"
          title="Save Template"
          className="download-pdf__template_download bg-[url('/images/template_download.svg')] bg-no-repeat bg-center bg-contain"
        />
        <p className="text-small mb-10">Save Template</p>

        <label className="download-pdf__template_upload bg-[url('/images/template_upload.svg')] bg-no-repeat bg-center bg-contain cursor-pointer">
          <input 
            type="file" 
            accept=".json,.template" 
            onChange={handleInput} 
            className="sr-only"
          />
        </label>
        <p className="text-small">Upload Template</p>
      </div>

    </>
  )
}

export default RealEstateDownload