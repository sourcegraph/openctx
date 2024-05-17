import React from 'react'
import ReactDOM from 'react-dom/client'
import { DemoApp } from './DemoApp.js'
import './main.css'

ReactDOM.createRoot(document.querySelector('#root') as HTMLElement).render(
    <React.StrictMode>
        <DemoApp />
    </React.StrictMode>
)
