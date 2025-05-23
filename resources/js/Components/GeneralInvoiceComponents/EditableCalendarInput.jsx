import { Text } from '@react-pdf/renderer'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import compose from '../../styles/compose.js'

const EditableCalendarInput = ({ className, value, selected, onChange, pdfMode }) => {
  return (
    <>
      {pdfMode ? (
        <Text style={compose('span ' + (className ? className : ''))}>{value}</Text>
      ) : (
        <DatePicker
          className={'input ' + (className ? className : '')}
          selected={selected}
          onChange={onChange ? (date) => onChange(date) : () => null}
          dateFormat="MMM dd, yyyy"
        />
      )}
    </>
  )
}

export default EditableCalendarInput
