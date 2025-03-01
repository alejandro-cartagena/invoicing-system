import { StyleSheet } from '@react-pdf/renderer'

const colorDark = '#222'
const colorDark2 = '#666'
const colorGray = '#e3e3e3'
const colorWhite = '#fff'

const styles = StyleSheet.create({
  dark: {
    color: colorDark,
  },

  white: {
    color: colorWhite,
  },

  'bg-dark': {
    backgroundColor: colorDark2,
  },

  'bg-gray': {
    backgroundColor: colorGray,
  },

  flex: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },

  'w-auto': {
    flexGrow: 1,
    paddingRight: 8,
  },

  'ml-30': {
    marginLeft: 30,
  },

  'w-100': {
    width: '100%',
  },

  'w-50': {
    width: '50%',
  },

  'w-55': {
    width: '55%',
  },

  'w-45': {
    width: '45%',
  },

  'w-60': {
    width: '60%',
  },

  'w-40': {
    width: '40%',
  },

  'w-48': {
    width: '48%',
  },

  'w-17': {
    width: '17%',
  },

  'w-18': {
    width: '18%',
  },

  row: {
    borderBottomWidth: 1,
    borderBottomColor: colorGray,
    borderBottomStyle: 'solid',
  },

  'mt-40': {
    marginTop: 40,
  },

  'mt-30': {
    marginTop: 30,
  },

  'mt-20': {
    marginTop: 20,
  },

  'mt-10': {
    marginTop: 10,
  },

  'mb-5': {
    marginBottom: 20,
  },

  'p-4-8': {
    padding: '4 8',
  },

  'p-5': {
    padding: 5,
  },

  'pb-10': {
    paddingBottom: 10,
  },

  right: {
    textAlign: 'right',
  },

  bold: {
    fontWeight: 'bold',
  },

  'fs-20': {
    fontSize: 20,
  },

  'fs-45': {
    fontSize: 45,
  },

  page: {
    fontFamily: 'Nunito',
    fontSize: 13,
    color: '#555',
    padding: '40 35',
  },

  span: {
    padding: '4 12 4 0',
  },

  logo: {
    maxWidth: 200,
    marginBottom: 20,
  },

  view: {
    // Base view style
  },

  image: {
    objectFit: 'contain',
    maxWidth: '100%',
  },

  'image__img': {
    maxWidth: '100%',
    height: 'auto',
  },

  // Text alignment
  'text-right': {
    textAlign: 'right',
  },
  'text-center': {
    textAlign: 'center',
  },

  // Font weights
  'font-semibold': {
    fontWeight: 600,
  },
  'font-bold': {
    fontWeight: 700,
  },

  // Background colors
  'bg-white': {
    backgroundColor: '#ffffff',
  },
  'bg-[#555]': {
    backgroundColor: '#555555',
  },
  'bg-[#e3e3e3]': {
    backgroundColor: '#e3e3e3',
  },

  // Text colors
  'text-white': {
    color: '#ffffff',
  },
  'text-gray-800': {
    color: '#1f2937',
  },

  // Padding
  'p-9': {
    padding: 36,
  },
  'px-2': {
    paddingLeft: 8,
    paddingRight: 8,
  },
  'py-1': {
    paddingTop: 4,
    paddingBottom: 4,
  },
  'p-[5px]': {
    padding: 5,
  },

  // Margins
  'mt-[10px]': {
    marginTop: 10,
  },
  'mt-[20px]': {
    marginTop: 20,
  },
  'mt-[30px]': {
    marginTop: 30,
  },
  'mr-[10px]': {
    marginRight: 10,
  },

  // Width
  'w-[100%]': {
    width: '100%',
  },
  'w-[50%]': {
    width: '50%',
  },
  'w-[48%]': {
    width: '48%',
  },
  'w-[45%]': {
    width: '45%',
  },

  // Shadow
  'shadow-md': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // Flex
  'flex': {
    display: 'flex',
    flexDirection: 'row',
  },
  'items-center': {
    alignItems: 'center',
  },

  // Position
  'relative': {
    position: 'relative',
  },

  // Font size
  'text-sm': {
    fontSize: 14,
  },
  'text-xl': {
    fontSize: 20,
  },
  'text-5xl': {
    fontSize: 48,
  },

  // Additional text colors
  'text-gray-800': {
    color: '#1f2937',
  },

  // Additional background colors
  'bg-red-500': {
    backgroundColor: '#ef4444',
  },
  'bg-green-500': {
    backgroundColor: '#22c55e',
  },

  // Additional spacing
  'mb-[5px]': {
    marginBottom: 5,
  },
  'mb-10': {
    marginBottom: 40,
  },

  // Additional width classes
  'w-[40%]': {
    width: '40%',
  },
  'w-[60%]': {
    width: '60%',
  },

  // Input specific styles
  'input': {
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    padding: '4 0',
  },

  // Link styles (for PDF)
  'link': {
    color: '#2563eb',
    textDecoration: 'none',
  },

  // Icon styles (for PDF)
  'icon': {
    width: 16,
    height: 16,
    borderRadius: 8,
  },

  // Additional utility classes
  'sr-only': {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: 0,
  },

  // Text alignment and decoration
  'underline': {
    textDecoration: 'underline',
  },

  // Additional width utilities
  'w-1/2': {
    width: '50%',
  },
  'w-[55%]': {
    width: '55%',
  },
  'w-[45%]': {
    width: '45%',
  },
})

export default styles
