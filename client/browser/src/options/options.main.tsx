import '../shared/polyfills'
// ^^ import polyfills first

import React from 'react'
import ReactDOM from 'react-dom/client'
import { OptionsPage } from './OptionsPage'

const root = document.createElement('div')
root.id = 'root'
document.body.append(root)

ReactDOM.createRoot(root).render(
    <React.StrictMode>
        <OptionsPage />
    </React.StrictMode>
)
