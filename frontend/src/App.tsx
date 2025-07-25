import { Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Layout from '@/components/Layout';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useLanguage } from '@/contexts';

function App() {
  const { direction } = useLanguage();
  const { i18n } = useTranslation();

  return (
    <div 
      className="min-h-screen bg-gray-50" 
      dir={direction}
      lang={i18n.language}
    >
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  {/* Additional protected routes will be added here */}
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;