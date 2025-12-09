import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Analyzing from './pages/Analyzing';
import ItemDetection from './pages/ItemDetection';
import ProductMatches from './pages/ProductMatches';
import RoomBoard from './pages/RoomBoard';
import MyBoards from './pages/MyBoards';
import Auth from './pages/Auth';
import ResetPassword from './pages/ResetPassword';
import PrivacyPolicy from './pages/PrivacyPolicy';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          {/* Upload, Analyzing, and ItemDetection routes are PUBLIC - auth modal shows on results page */}
          <Route path="/upload" element={<Upload />} />
          <Route path="/analyzing/:boardId" element={<Analyzing />} />
          <Route path="/item-detection/:boardId" element={<ItemDetection />} />
          {/* Other results pages require authentication */}
          <Route
            path="/products/:boardId/:itemId"
            element={
              <ProtectedRoute>
                <ProductMatches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/board/:boardId"
            element={
              <ProtectedRoute>
                <RoomBoard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-boards"
            element={
              <ProtectedRoute>
                <MyBoards />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;