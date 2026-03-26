import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import VendorLogin from './pages/VendorLogin';
import VendorSignup from './pages/VendorSignup';
import VendorDashboard from './pages/VendorDashboard';

function VendorDashboardProtected() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.replace('/vendor/login');
        return;
      }
      setChecking(false);
    });
  }, []);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return <VendorDashboard />;
}

export default function VendorApp() {
  return (
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/vendor/login" element={<VendorLogin />} />
          <Route path="/vendor/signup" element={<VendorSignup />} />
          <Route path="/vendor/dashboard" element={<VendorDashboardProtected />} />
          <Route path="*" element={<VendorLogin />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}

