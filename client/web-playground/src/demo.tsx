import React from 'react'
import ReactDOM from 'react-dom/client'
import './demo.css'
import { DemoApp } from './demo/DemoApp'

ReactDOM.createRoot(document.querySelector('#root') as HTMLElement).render(
    <React.StrictMode>
        <DemoApp />
    </React.StrictMode>
)
