import autoprefixer from 'autoprefixer'
// import type { Config } from 'postcss-load-config'
import tailwindcss from 'tailwindcss'

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: [tailwindcss(), autoprefixer()],
}

export default config
