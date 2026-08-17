import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '@pospe/ui-library';

import PosShell from './layouts/PosShell';
import PosProtectedRoute from './routes/PosProtectedRoute';
import PosLoginPage from './pages/PosLoginPage';
import PosTouchPage from './pages/PosTouchPage';
import PosHoldSuspendPage from './pages/PosHoldSuspendPage';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PosLoginPage />} />

          <Route element={<PosProtectedRoute />}>
            <Route element={<PosShell />}>
              <Route path="/pos" element={<PosTouchPage />} />
              <Route path="/pos/held-bills" element={<PosHoldSuspendPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
