import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import CartDrawer from './components/CartDrawer.jsx'
import Home from './pages/Home.jsx'
import Producto from './pages/Producto.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  return (
    <>
      <Header />
      <CartDrawer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/producto/:id" element={<Producto />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </>
  )
}
