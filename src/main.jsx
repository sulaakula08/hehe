import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './auth.jsx'
import './styles.css'

// StrictMode намеренно выключен: его двойной монтаж в dev ломает AnimatePresence
// у framer-motion — закрытые модалки и scrim остаются в DOM и перехватывают клики.
// На прод-сборку это не влияло (двойной рендер бывает только в dev), но мешало разработке.
// Если framer починят — можно вернуть обратно.
ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
  </AuthProvider>
)
