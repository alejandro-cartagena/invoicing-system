import { useRef, useState } from 'react'
import Slider from 'rc-slider'
import { Image } from '@react-pdf/renderer'
import useOnClickOutside from '../../hooks/useOnClickOutside'
import compose from '../../styles/compose.js'
import 'rc-slider/assets/index.css'
import imageCompression from 'browser-image-compression'
import { toast } from 'react-hot-toast'

const MAX_IMAGE_SIZE_MB = 1; // Maximum image size in MB
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024; // Convert to bytes

const EditableFileImage = ({
  className,
  placeholder,
  value,
  width,
  onChangeImage,
  onChangeWidth,
  pdfMode,
}) => {
  const fileInput = useRef(null)
  const widthWrapper = useRef(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const marks = {
    100: '100px',
    150: '150px',
    200: '200px',
    250: '250px',
  }

  const handleClickOutside = () => {
    if (isEditing) {
      setIsEditing(false)
    }
  }

  useOnClickOutside(widthWrapper, handleClickOutside)

  const handleUpload = () => {
    fileInput?.current?.click()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      setIsLoading(true)
      
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        toast.error('The uploaded file is not an image')
        return
      }
      
      // Check file size
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast(`Image is large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Compressing...`, {
          icon: '🔍',
          duration: 3000
        })
        
        try {
          // Compression options
          const options = {
            maxSizeMB: MAX_IMAGE_SIZE_MB,
            maxWidthOrHeight: 1200,
            useWebWorker: true
          }
          
          // Compress the image
          const compressedFile = await imageCompression(file, options)
          console.log(`Compressed from ${(file.size / (1024 * 1024)).toFixed(2)}MB to ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB`)
          
          // If still too large after compression
          if (compressedFile.size > MAX_IMAGE_SIZE_BYTES) {
            toast.error(`Image is still too large after compression (${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB). Maximum size is ${MAX_IMAGE_SIZE_MB}MB.`)
            return
          }
          
          // Convert to base64 and call the change handler
          const reader = new FileReader()
          reader.onload = (e) => {
            onChangeImage(e.target.result)
            toast.success('Image compressed and uploaded successfully')
          }
          reader.readAsDataURL(compressedFile)
        } catch (error) {
          console.error('Error during image compression:', error)
          toast.error(`Failed to compress image: ${error.message}`)
        }
      } else {
        // If image is already within size limits
        const reader = new FileReader()
        reader.onload = (e) => {
          onChangeImage(e.target.result)
        }
        reader.readAsDataURL(file)
      }
    } catch (error) {
      console.error('Error handling file:', error)
      toast.error(`Error uploading image: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangeWidth = (value) => {
    if (typeof onChangeWidth === 'function') {
      onChangeWidth(value)
    }
  }

  const handleEdit = () => {
    setIsEditing(!isEditing)
  }

  const clearImage = () => {
    if (typeof onChangeImage === 'function') {
      onChangeImage('')
    }
  }

  if (pdfMode) {
    if (value) {
      return (
        <Image
          style={{
            ...compose(`image ${className ? className : ''}`),
            maxWidth: width,
          }}
          src={value}
        />
      )
    } else {
      return <></>
    }
  }

  return (
    <div className={`image ${value ? 'mb-5' : ''} ${className ? className : ''}`}>
      {!value ? (
        <>
          <button type="button" className="image__upload" onClick={handleUpload}>
            {placeholder}
          </button>
          <div className="text-xs text-gray-500 mt-1">
            Max size: {MAX_IMAGE_SIZE_MB}MB
          </div>
        </>
      ) : (
        <>
          <img
            src={value}
            className="image__img"
            alt={placeholder}
            style={{ maxWidth: width || 100 }}
          />

          <button type="button" className="image__change" onClick={handleUpload}>
            Change Image
          </button>

          <button type="button" className="image__edit" onClick={handleEdit}>
            Resize Image
          </button>

          <button type="button" className="image__remove" onClick={clearImage}>
            Remove
          </button>

          {isEditing && (
            <div ref={widthWrapper} className="image__width-wrapper">
              <Slider
                min={100}
                max={250}
                marks={marks}
                included={false}
                step={1}
                onChange={handleChangeWidth}
                defaultValue={width || 100}
              />
            </div>
          )}
        </>
      )}

      <input
        ref={fileInput}
        tabIndex={-1}
        type="file"
        accept="image/*"
        className="image__file"
        onChange={handleFileChange}
      />
    </div>
  )
}

export default EditableFileImage
