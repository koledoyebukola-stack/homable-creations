import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Analyzing from './pages/Analyzing';
import ItemDetection from './pages/ItemDetection';
import ProductMatches from './pages/ProductMatches';
import RoomBoard from './pages/RoomBoard';
import MyBoards from './pages/MyBoards';
import History from './pages/History';
import Checklists from './pages/Checklists';
import ChecklistDetail from './pages/ChecklistDetail';
import ChecklistGiftingView from './pages/ChecklistGiftingView';
import Auth from './pages/Auth';
import ResetPassword from './pages/ResetPassword';
import PrivacyPolicy from './pages/PrivacyPolicy';
import SpecsForm from './pages/SpecsForm';
import SpecsResults from './pages/SpecsResults';
import TemplateResults from './pages/TemplateResults';
import DesignSpaceAnalyze from './pages/DesignSpaceAnalyze';
import DesignSpaceOptions from './pages/DesignSpaceOptions';
import DesignSpaceItems from './pages/DesignSpaceItems';
import ShopsHome from './pages/ShopsHome';
import ShopsSearch from './pages/ShopsSearch';
import ShopsProductDetail from './pages/ShopsProductDetail';
import DemoStorefront from './pages/DemoStorefront';
import StorefrontView from './pages/StorefrontView';
import ExploreScenePage from './pages/ExploreScenePage';
import AiRoomGenerator from './pages/AiRoomGenerator';
import NotFound from './pages/NotFound';
import { CountryProvider, useCountry } from '@/context/CountryContext';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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

const REF_STORAGE_KEY = 'homable_ref';

function CaptureReferrerAndRoutes() {
  const location = useLocation();
  useEffect(() => {
    const ref = new URLSearchParams(location.search).get('ref');
    if (ref) {
      const normalized = ref.trim().toLowerCase();
      if (normalized) sessionStorage.setItem(REF_STORAGE_KEY, normalized);
    }
  }, [location.search]);

  const { country, setCountry } = useCountry();
  const [otherBannerDismissed, setOtherBannerDismissed] = useState(false);

  return (
    <>
      <Header />

      {/* Other market banner (Other only): between navbar and page content, session-only dismiss */}
      {country === 'OTHER' && !otherBannerDismissed && (
        <div className="bg-stone-800 text-white px-4 py-3 flex flex-wrap items-center justify-center gap-3 sm:gap-4 relative z-20">
          <p className="text-sm sm:text-base text-center pr-8 sm:pr-10">
            Homable Creations is predominantly available in two markets — Canada and Nigeria. Switch to get the full curated experience.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="bg-white/15 hover:bg-white/25 text-white border-0 shrink-0"
              onClick={() => {
                setCountry('CA');
              }}
            >
              <span className="mr-1">🇨🇦</span>
              <span>Switch to Canada</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="bg-white/15 hover:bg-white/25 text-white border-0 shrink-0"
              onClick={() => {
                setCountry('NG');
              }}
            >
              <span className="mr-1">🇳🇬</span>
              <span>Switch to Nigeria</span>
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setOtherBannerDismissed(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss banner"
          >
            ×
          </button>
        </div>
      )}

      <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          {/* Upload, Analyzing, and ItemDetection routes are PUBLIC - auth modal shows on results page */}
          <Route path="/upload" element={<Upload />} />
          <Route path="/explore/:slug" element={<ExploreScenePage />} />
          <Route path="/analyzing/:boardId" element={<Analyzing />} />
          <Route path="/item-detection/:boardId" element={<ItemDetection />} />
          {/* Design Space flow routes - PUBLIC */}
          <Route path="/design-space/analyze" element={<DesignSpaceAnalyze />} />
          <Route path="/design-space/options" element={<DesignSpaceOptions />} />
          <Route path="/design-space/items" element={<DesignSpaceItems />} />
          {/* Specs flow routes - PUBLIC */}
          <Route path="/specs/:categoryId" element={<SpecsForm />} />
          <Route path="/specs-results" element={<SpecsResults />} />
          <Route path="/template-results/:templateId" element={<TemplateResults />} />
          {/* Homable Shops - public placeholders */}
          <Route path="/shops" element={<ShopsHome />} />
          <Route path="/shops/products/:slug" element={<ShopsProductDetail />} />
          <Route path="/shops/:query" element={<ShopsSearch />} />
          {/* Demo storefront - hidden route, direct access only */}
          <Route path="/stores/demo-decor-store" element={<DemoStorefront />} />
          {/* Category-specific storefront URL (shareable, e.g. /stores/wafco/beds) */}
          <Route path="/stores/:slug/:category" element={<StorefrontView />} />
          {/* Dynamic storefront - real data from Supabase */}
          <Route path="/stores/:slug" element={<StorefrontView />} />
          {/* AI Room Generator — 4-step flow (mock payment in Phase 1) */}
          <Route path="/ai-room-generator" element={<AiRoomGenerator />} />
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
            path="/product-matches/:boardId"
            element={
              <ProtectedRoute>
                <ItemDetection />
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
          {/* History route - protected */}
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          {/* Checklists routes - protected */}
          <Route
            path="/checklists"
            element={
              <ProtectedRoute>
                <Checklists />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checklists/:id"
            element={
              <ProtectedRoute>
                <ChecklistDetail />
              </ProtectedRoute>
            }
          />
          {/* Shared gifting view - PUBLIC (no auth required) */}
          <Route
            path="/checklists/gift/:token"
            element={<ChecklistGiftingView />}
          />
          <Route path="*" element={<NotFound />} />
      </Routes>

      <Footer />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <CountryProvider>
          <CaptureReferrerAndRoutes />
        </CountryProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;