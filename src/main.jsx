import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { STORE } from './lib/config.js'
import './index.css'

// Aplica los colores de marca definidos en config.js
const c = STORE.colores
const root = document.documentElement
root.style.setProperty('--color-primario', c.primario)
root.style.setProperty('--color-primario-claro', c.primarioClaro)
root.style.setProperty('--color-acento', c.acento)
root.style.setProperty('--color-acento-oscuro', c.acentoOscuro)
root.style.setProperty('--color-fondo', c.fondo)
root.style.setProperty('--color-superficie', c.superficie)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CartProvider>
        <App />
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>
)
