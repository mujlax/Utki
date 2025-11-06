import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import WheelPage from './pages/WheelPage'

const App = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/wheel" element={<WheelPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default App
