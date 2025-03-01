import { StyleSheet } from '@react-pdf/renderer'
import styles from './styles'

const compose = (classes) => {
  if (!classes) return {}

  const css = {}
  const classesArray = classes.split(' ').filter(Boolean)

  classesArray.forEach((className) => {
    if (styles[className]) {
      Object.assign(css, styles[className])
    }
  })

  return css
}

export default compose
