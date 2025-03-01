import React from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { useDebounce } from '@uidotdev/usehooks'
import InvoicePage from './InvoicePage'
import FileSaver from 'file-saver'

const Download = ({ data, setData }) => {
  const debounced = useDebounce(data, 500)

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

  const title = data.invoiceTitle ? data.invoiceTitle.toLowerCase() : 'invoice'
  return (
    <div className={'download-pdf '}>
      <PDFDownloadLink
        key="pdf"
        document={<InvoicePage pdfMode={true} data={debounced} />}
        fileName={`${title}.pdf`}
        aria-label="Save PDF"
        title="Save PDF"
        className="download-pdf__pdf"
      ></PDFDownloadLink>
      <p>Save PDF</p>

      <button
        onClick={handleSaveTemplate}
        aria-label="Save Template"
        title="Save Template"
        className="download-pdf__template_download mt-40"
      />
      <p className="text-small">Save Template</p>

      <label className="download-pdf__template_upload">
        <input type="file" accept=".json,.template" onChange={handleInput} />
      </label>
      <p className="text-small">Upload Template</p>
    </div>
  )
}

export default Download