import { Text } from '@react-pdf/renderer'
import compose from '../../styles/compose.js'

const EditableInput = ({ className, placeholder, value, onChange, pdfMode, readOnly }) => {
  return (
    <>
      {pdfMode ? (
        <Text style={compose('span ' + (className ? className : ''))}>{value}</Text>
      ) : (
        <input
          type="text"
          className={'input ' + (className ? className : '')}
          placeholder={placeholder || ''}
          value={value || ''}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          readOnly={readOnly}
        />
      )}
    </>
  )
}

export default EditableInput
