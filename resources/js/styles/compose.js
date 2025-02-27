import ReactPDF from '@react-pdf/renderer'
import styles from './styles'

const compose = (classes) => {
  const css = {
    '@import': 'url(https://fonts.bunny.net/css?family=nunito:400,600)',
  }

  const classesArray = classes.replace(/\s+/g, ' ').split(' ')

  classesArray.forEach((className) => {
    if (typeof styles[className] !== undefined) {
      Object.assign(css, styles[className])
    }
  })

  return css
}

export default compose
