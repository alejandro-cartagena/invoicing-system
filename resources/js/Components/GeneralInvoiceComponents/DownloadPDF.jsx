import React from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { useDebounce } from '@uidotdev/usehooks'
import InvoicePage from './InvoicePage'
import FileSaver from 'file-saver'

const Download = ({ data, setData }) => {
  const debounced = useDebounce(data, 500)
  const title = data.invoiceTitle ? data.invoiceTitle.toLowerCase() : 'invoice'

  function handleInput(e) {
    if (!e.target.files?.length) return

    const file = e.target.files[0]
    file
      .text()
      .then((str) => {
        try {
          if (!(str.startsWith('{') && str.endsWith('}'))) {
            str = atob(str)
          }
          const d = JSON.parse(str)
          setData(d)
        } catch (e) {
          console.error(e)
          return
        }
      })
      .catch((err) => console.error(err))
  }

  function handleSaveTemplate() {
    const blob = new Blob([JSON.stringify(debounced)], {
      type: 'text/plain;charset=utf-8',
    })
    FileSaver(blob, title + '.template')
  }

  return (
    <div className={'download-pdf '}>
      <PDFDownloadLink
        key={JSON.stringify(debounced)}
        document={<InvoicePage pdfMode={true} data={debounced} />}
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
  )
}

export default Download
