import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Auth from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Search } from 'lucide-react';
import { getTemplateById } from '@/lib/specs-templates';
import { buildSpecsQuery } from '@/lib/specs-query-builder';
import { 
  getAmazonSearchUrl, 
  getWalmartSearchUrl, 
  getWayfairSearchUrl, 
  getTemuSearchUrl, 
  getSheinSearchUrl,
  getGoogleSearchUrl 
} from '@/lib/retailer-utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Field labels by category
const FIELD_LABELS: Record<string, Record<string, string>> = {
  'sofa': {
    width: 'Max width',
    seating: 'Seating capacity',
    shape: 'Shape',
    orientation: 'Orientation',
    fabric: 'Fabric type',
    color: 'Color family'
  },
  'dining-table': {
    length: 'Max length',
    seating: 'Seating capacity',
    shape: 'Shape',
    material: 'Material',
    color: 'Color family'
  },
  'rug': {
    width: 'Max width',
    length: 'Max length',
    shape: 'Shape',
    material: 'Material',
    color: 'Color family'
  },
  'bed': {
    size: 'Bed size',
    height: 'Max height',
    style: 'Style',
    material: 'Material',
    color: 'Color family'
  },
  'desk': {
    width: 'Max width',
    depth: 'Max depth',
    style: 'Style',
    material: 'Material',
    color: 'Color family'
  }
};

// Units by field
const FIELD_UNITS: Record<string, string> = {
  width: 'inches',
  length: 'inches',
  depth: 'inches',
  height: 'inches',
  seating: 'people'
};

// Special formatting for rug dimensions (feet instead of inches)
const formatFieldValue = (fieldId: string, value: string | number, category: string): string => {
  if (category === 'rug' && (fieldId === 'width' || fieldId === 'length')) {
    return `${value} feet`;
  }
  
  const unit = FIELD_UNITS[fieldId];
  if (unit) {
    return `${value} ${unit}`;
  }
  
  // Capitalize first letter for text values
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
};

// Helper function to handle async retailer button clicks
async function handleRetailerClick(getUrlFn: (query: string) => Promise<string>, query: string) {
  try {
    const url = await getUrlFn(query);
    window.open(url, '_blank');
  } catch (error) {
    console.error('Failed to generate retailer URL:', error);
    toast.error('Failed to open retailer link');
  }
}

export default function TemplateResults() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(getTemplateById(templateId || ''));
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setLoading(false);
      
      // Show auth modal after a delay if not authenticated
      if (!user) {
        setTimeout(() => setShowAuthModal(true), 1000);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authenticated = !!session?.user;
      setIsAuthenticated(authenticated);
      if (authenticated) {
        setShowAuthModal(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (templateId) {
      const foundTemplate = getTemplateById(templateId);
      setTemplate(foundTemplate);
    }
  }, [templateId]);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setIsAuthenticated(true);
  };

  if (!template) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-[#111111] mb-4">Template not found</h1>
            <Button onClick={() => navigate('/upload?tab=specs')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to categories
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Build search query using the same logic as Specs results
  const searchQuery = buildSpecsQuery({
    category: template.category,
    ...template.formData
  });

  const handleGoogleSearch = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    const url = getGoogleSearchUrl(searchQuery);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleRetailerClickWithAuth = async (getUrlFn: (query: string) => Promise<string>, query: string) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    await handleRetailerClick(getUrlFn, query);
  };

  const handleBack = () => {
    navigate(`/specs/${template.category}`);
  };

  const fieldLabels = FIELD_LABELS[template.category] || {};

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-[#555555]">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={handleBack}
            variant="ghost"
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to form
          </Button>

          <div className="bg-white rounded-3xl p-8 shadow-lg">
            {/* Template Image Preview */}
            <div className="mb-8">
              <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-gray-100 mb-4">
                <img
                  src={template.image}
                  alt={template.label}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://placehold.co/800x500/e5e5e5/666666?text=${encodeURIComponent(template.label)}`;
                  }}
                />
              </div>
              <h1 className="text-3xl font-bold text-[#111111] mb-2">
                {template.label}
              </h1>
              <p className="text-[#555555]">
                {template.styleDetails.description}
              </p>
            </div>

            {/* Style Details - Using Form Fields */}
            <div className="mb-8 p-6 bg-gray-50 rounded-2xl">
              <h2 className="text-xl font-semibold text-[#111111] mb-4">
                Style details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(template.formData).map(([fieldId, value]) => {
                  const label = fieldLabels[fieldId];
                  if (!label) return null;
                  
                  return (
                    <div key={fieldId}>
                      <p className="text-xs text-[#888888] mb-1">{label}</p>
                      <p className="text-sm font-medium text-[#111111]">
                        {formatFieldValue(fieldId, value, template.category)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Search Query Display */}
            <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <p className="text-xs font-medium text-[#555555] uppercase tracking-wide mb-2">
                Search query
              </p>
              <p className="text-sm font-mono text-[#111111] break-words">
                {searchQuery}
              </p>
            </div>

            {/* Show retailer buttons only if authenticated */}
            {isAuthenticated ? (
              <>
                {/* Retailer Buttons - Using IP-based location detection */}
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-[#111111] mb-4">
                    Shop this style
                  </h2>
                  
                  {/* Primary retailers: Amazon, Wayfair, Walmart */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full bg-white border border-[#FF9900] text-[#111111] hover:bg-[#FF9900]/10 font-medium"
                      onClick={() => handleRetailerClickWithAuth(getAmazonSearchUrl, searchQuery)}
                    >
                      Amazon
                      <ExternalLink className="ml-1.5 h-3 w-3" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full bg-white border border-[#7B2CBF] text-[#111111] hover:bg-[#7B2CBF]/10 font-medium"
                      onClick={() => handleRetailerClickWithAuth(getWayfairSearchUrl, searchQuery)}
                    >
                      Wayfair
                      <ExternalLink className="ml-1.5 h-3 w-3" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full bg-white border border-[#0071CE] text-[#111111] hover:bg-[#0071CE]/10 font-medium"
                      onClick={() => handleRetailerClickWithAuth(getWalmartSearchUrl, searchQuery)}
                    >
                      Walmart
                      <ExternalLink className="ml-1.5 h-3 w-3" />
                    </Button>
                  </div>

                  {/* Secondary retailers: Temu & Shein */}
                  <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full bg-white border border-[#FF7A00] text-[#555555] hover:bg-[#FF7A00]/10"
                      onClick={() => handleRetailerClickWithAuth(getTemuSearchUrl, searchQuery)}
                    >
                      Temu
                      <ExternalLink className="ml-1.5 h-3 w-3" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full bg-white border border-[#000000] text-[#555555] hover:bg-[#000000]/10"
                      onClick={() => handleRetailerClickWithAuth(getSheinSearchUrl, searchQuery)}
                    >
                      Shein
                      <ExternalLink className="ml-1.5 h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Google Search */}
                <div className="pt-4 border-t border-gray-200">
                  <Button
                    onClick={handleGoogleSearch}
                    variant="outline"
                    size="sm"
                    className="w-full bg-gray-50 hover:bg-gray-100 text-[#111111] border-gray-200 font-medium"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Search the web (Google)
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-[#555555] mb-4">Sign in to shop this style</p>
                <Button onClick={() => setShowAuthModal(true)}>
                  Sign in
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Auth Modal */}
      {showAuthModal && !isAuthenticated && (
        <Auth
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}