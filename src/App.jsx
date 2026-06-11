import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RegistrationPage from './pages/RegistrationPage';
import SuccessPage      from './pages/SuccessPage';
import CancelPage       from './pages/CancelPage';
import AdminPage        from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<RegistrationPage />} />
        <Route path="/success"       element={<SuccessPage />} />
        <Route path="/cancel/:token" element={<CancelPage />} />
        <Route path="/admin"         element={<AdminPage />} />
        {/* Any other path → home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
