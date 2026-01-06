import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import VendorShareModal from '@/components/VendorShareModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { getProductsForItem, searchProducts, getDetectedItems, createChecklist, getBoardById, generateCarpenterSpec } from '@/lib/api';
import { Product, DetectedItem, CarpenterSpec } from '@/lib/types';
import { toast } from 'sonner';
import { ExternalLink, Star, Upload, ListChecks, Search, Ruler, Hammer, Package, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  getAmazonSearchUrl, 
  getWalmartSearchUrl, 
  getWayfairSearchUrl, 
  getTemuSearchUrl, 
  getSheinSearchUrl,
  getGoogleSearchUrl,
  buildRetailerQuery
} from '@/lib/retailer-utils';

// Resilient clipboard copy function that works across embedded/sandboxed contexts
const copyToClipboard = async (text: string): Promise<boolean> => {
  // Method 1: Try modern Clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback method:', err);
    }
  }

  // Method 2: Fallback using execCommand (works in more contexts)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make the textarea invisible but still selectable
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    // Try to copy using execCommand
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      return true;
    }
  } catch (err) {
    console.warn('execCommand fallback failed:', err);
  }

  // Method 3: Last resort - try to use parent window's clipboard (for iframes)
  if (window.parent && window.parent !== window) {
    try {
      if (window.parent.navigator.clipboard && window.parent.navigator.clipboard.writeText) {
        await window.parent.navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.warn('Parent window clipboard access failed:', err);
    }
  }

  return false;
};

// Helper function to copy text and open affiliate link
const handleAffiliateClick = async (itemName: string, affiliateUrl: string, platform: string) => {
  // Always open the affiliate link first
  window.open(affiliateUrl, '_blank', 'noopener,noreferrer');
  
  // Then attempt to copy
  try {
    const success = await copyToClipboard(itemName);
    
    if (success) {
      toast.success('Copied! Paste into the search bar.', {
        duration: 3000,
      });
    } else {
      // If copy failed, show a helpful message with the item name
      toast.info(`Search for: ${itemName}`, {
        duration: 5000,
        description: 'Copy this text to search on the site',
      });
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    // Show the item name so user can manually copy it
    toast.info(`Search for: ${itemName}`, {
      duration: 5000,
      description: 'Copy this text to search on the site',
    });
  }
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

// Helper function to determine if an item is buildable furniture
// Uses intent_class from database as single source of truth
function isBuildableFurniture(item: DetectedItem): boolean {
  if (item.intent_class) {
    return item.intent_class === 'buildable_furniture';
  }
  console.warn(`[intent_class] Missing for "${item.item_name}" - defaulting to NOT buildable`);
  return false;
}

// Helper function to determine if Western retailers should be shown
// For Nigerian users with non-furniture items (soft_goods, lighting, decor, electronics), hide Western retailers
function shouldShowWesternRetailers(isNigeria: boolean, item: DetectedItem): boolean {
  if (!isNigeria) return true; // Non-Nigerian users always see Western retailers
  
  // Nigerian users: check intent_class
  const nigerianNonFurnitureClasses = ['soft_goods', 'lighting', 'decor', 'electronics'];
  
  if (item.intent_class && nigerianNonFurnitureClasses.includes(item.intent_class)) {
    console.log(`[Nigerian Non-Furniture] "${item.item_name}" (${item.intent_class}) - hiding Western retailers`);
    return false;
  }
  
  return true; // Show for buildable_furniture or other intent classes
}

// Helper function to determine if "Share with a vendor" should be shown
// For Nigerian users with non-furniture items only
function shouldShowVendorShare(isNigeria: boolean, item: DetectedItem): boolean {
  if (!isNigeria) return false; // Only for Nigerian users
  
  // Show for non-furniture items (soft_goods, lighting, decor, electronics)
  const nigerianNonFurnitureClasses = ['soft_goods', 'lighting', 'decor', 'electronics'];
  
  if (item.intent_class && nigerianNonFurnitureClasses.includes(item.intent_class)) {
    console.log(`[Nigerian Non-Furniture] "${item.item_name}" (${item.intent_class}) - showing vendor share`);
    return true;
  }
  
  return false;
}

export default function ProductMatches() {
  const { boardId, itemId } = useParams<{ boardId: string; itemId: string }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [item, setItem] = useState<DetectedItem | null>(null);
  const [board, setBoard] = useState<{ source_image_url: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isNigeria, setIsNigeria] = useState(false);
  const [carpenterSpec, setCarpenterSpec] = useState<CarpenterSpec | null>(null);
  const [generatingSpec, setGeneratingSpec] = useState(false);
  const [vendorShareModal, setVendorShareModal] = useState<{
    isOpen: boolean;
    item: DetectedItem | null;
  }>({ isOpen: false, item: null });

  useEffect(() => {
    // Check authentication status
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });
  }, []);

  useEffect(() => {
    if (!boardId || !itemId) return;

    const loadData = async () => {
      try {
        // Check if user is from Nigeria and load board
        const boardData = await getBoardById(boardId);
        const userIsNigeria = boardData?.country === 'NG';
        setIsNigeria(userIsNigeria);
        setBoard(boardData);

        const items = await getDetectedItems(boardId);
        const currentItem = items.find((i) => i.id === itemId);
        if (currentItem) {
          setItem(currentItem);
        }

        // For Nigeria users with buildable furniture, DON'T auto-generate spec
        // Just load the page and show the execution options
        if (userIsNigeria && currentItem && isBuildableFurniture(currentItem)) {
          setLoading(false);
          return;
        }

        // For Nigerian non-furniture items, skip product search entirely
        // Just show vendor share options
        if (userIsNigeria && currentItem && shouldShowVendorShare(userIsNigeria, currentItem)) {
          console.log(`[Nigerian Non-Furniture] Skipping product search for "${currentItem.item_name}"`);
          setProducts([]);
          setLoading(false);
          return;
        }

        // For non-Nigeria users OR other items, continue with product search
        const existingProducts = await getProductsForItem(itemId);
        
        if (existingProducts.length > 0) {
          setProducts(existingProducts);
          setLoading(false);
        } else {
          // If no products exist, trigger search
          setSearching(true);
          const searchResult = await searchProducts(itemId);
          setProducts(searchResult.products || []);
          setSearching(false);
          setLoading(false);
        }
      } catch (error: unknown) {
        console.error('Error loading products:', error);
        toast.error('Failed to load products');
        setLoading(false);
        setSearching(false);
      }
    };

    loadData();
  }, [boardId, itemId]);

  const handleSaveAsChecklist = async () => {
    if (!item || !boardId) return;

    if (!isAuthenticated) {
      toast.error('Please sign in to save checklists');
      navigate('/auth?mode=signin');
      return;
    }

    try {
      setSavingChecklist(true);
      
      // Create checklist with the item name as the default name
      const checklistName = `${item.item_name} – Checklist`;
      const items = products.length > 0 
        ? products.map(p => p.product_name)
        : [item.item_name];

      const checklist = await createChecklist(checklistName, boardId, items);
      
      toast.success('Checklist created!');
      navigate(`/checklists/${checklist.id}`);
    } catch (error: unknown) {
      console.error('Failed to create checklist:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create checklist');
    } finally {
      setSavingChecklist(false);
    }
  };

  // Handle generating carpenter spec on-demand
  const handleGenerateCarpenterSpec = async () => {
    if (!item) return;

    try {
      setGeneratingSpec(true);
      const spec = await generateCarpenterSpec(item);
      setCarpenterSpec(spec);
      toast.success('Carpenter specifications generated!');
    } catch (error) {
      console.error('Failed to generate carpenter spec:', error);
      toast.error('Failed to generate carpenter specifications');
    } finally {
      setGeneratingSpec(false);
    }
  };

  if (loading || searching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <LoadingSpinner
            message={searching ? 'Finding the best deals...' : 'Loading products...'}
          />
        </main>
      </div>
    );
  }

  // Determine if Western retailers should be shown
  const showWesternRetailers = item ? shouldShowWesternRetailers(isNigeria, item) : true;
  const showVendorShare = item ? shouldShowVendorShare(isNigeria, item) : false;

  // Nigeria-specific view for buildable furniture
  if (isNigeria && item && isBuildableFurniture(item)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50">
        <Header />

        <main className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <Button
                variant="ghost"
                onClick={() => navigate(`/item-detection/${boardId}`)}
                className="text-[#555555] hover:text-[#C89F7A]"
              >
                ← Back to Results
              </Button>
            </div>

            {item && (
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4 text-[#111111]">{item.item_name}</h1>
                <div className="flex justify-center gap-2 flex-wrap">
                  <Badge className="bg-[#C89F7A] text-white">{item.category}</Badge>
                  {item.style && <Badge variant="outline" className="border-[#C89F7A] text-[#C89F7A]">{item.style}</Badge>}
                  {item.dominant_color && <Badge variant="outline">{item.dominant_color}</Badge>}
                </div>
                {item.description && (
                  <p className="text-[#555555] mt-4 max-w-2xl mx-auto">{item.description}</p>
                )}
              </div>
            )}

            {/* Execution Options Card - Always visible */}
            {!carpenterSpec && (
              <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-200 shadow-sm mb-8">
                <CardContent className="p-6 md:p-8 space-y-4">
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-[#111111] mb-2 uppercase tracking-wide">
                      EXECUTION OPTIONS
                    </h3>
                    <p className="text-xs text-[#666666] mb-4">
                      Choose how you want to get this item
                    </p>
                  </div>

                  {/* Primary: Get Carpenter Specifications */}
                  <Button
                    onClick={handleGenerateCarpenterSpec}
                    disabled={generatingSpec}
                    className="w-full bg-gradient-to-r from-[#C89F7A] to-[#B5896C] hover:from-[#B5896C] hover:to-[#C89F7A] text-white rounded-full font-semibold shadow-lg"
                    size="lg"
                  >
                    <Hammer className="h-5 w-5 mr-2" />
                    {generatingSpec ? 'Generating...' : 'Get Carpenter Specifications'}
                  </Button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-2 text-[#666666]">OR</span>
                    </div>
                  </div>

                  {/* Secondary: Google Search */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#111111] text-center">
                      Search online
                    </h4>
                    <Button
                      onClick={() => window.open(getGoogleSearchUrl(buildRetailerQuery(item)), '_blank')}
                      variant="outline"
                      size="sm"
                      className="w-full bg-white hover:bg-gray-50 text-[#111111] border-gray-300 font-medium"
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Search the web (Google)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Carpenter Specification Card - Only shown after generation */}
            {carpenterSpec && (
              <>
                <Card className="overflow-hidden border-2 border-[#C89F7A] shadow-lg mb-8">
                  <CardHeader className="bg-gradient-to-r from-[#C89F7A] to-[#B5896C] text-white p-6">
                    <div className="flex items-center gap-3">
                      <Hammer className="h-6 w-6" />
                      <h2 className="text-2xl font-bold">Custom Fabrication Specifications</h2>
                    </div>
                    <p className="text-sm mt-2 text-white/90">
                      Ready-to-build specifications for local Nigerian carpenters
                    </p>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* Dimensions */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Ruler className="h-5 w-5 text-[#C89F7A]" />
                        <h3 className="text-lg font-semibold text-[#111111]">Dimensions</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-[#555555]">Width</p>
                          <p className="text-xl font-bold text-[#111111]">{carpenterSpec.dimensions.width_cm} cm</p>
                        </div>
                        <div>
                          <p className="text-sm text-[#555555]">Depth</p>
                          <p className="text-xl font-bold text-[#111111]">{carpenterSpec.dimensions.depth_cm} cm</p>
                        </div>
                        <div>
                          <p className="text-sm text-[#555555]">Height</p>
                          <p className="text-xl font-bold text-[#111111]">{carpenterSpec.dimensions.height_cm} cm</p>
                        </div>
                      </div>
                      {carpenterSpec.dimensions.notes && (
                        <p className="text-sm text-[#666666] mt-3 italic">{carpenterSpec.dimensions.notes}</p>
                      )}
                    </div>

                    {/* Material */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="h-5 w-5 text-[#C89F7A]" />
                        <h3 className="text-lg font-semibold text-[#111111]">Recommended Material</h3>
                      </div>
                      <p className="text-2xl font-bold text-[#C89F7A] mb-2">{carpenterSpec.material}</p>
                      <p className="text-sm text-[#555555]">{carpenterSpec.material_reasoning}</p>
                    </div>

                    {/* Finish */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#111111] mb-2">Finish</h3>
                      <p className="text-base text-[#555555] bg-gray-50 rounded-lg p-3">{carpenterSpec.finish}</p>
                    </div>

                    {/* Construction Features */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#111111] mb-3">Construction Features</h3>
                      <ul className="space-y-2">
                        {carpenterSpec.construction_features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-[#C89F7A] mt-1">•</span>
                            <span className="text-[#555555]">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Cost & Time Estimates */}
                    <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-[#555555] mb-1">Estimated Cost Range</p>
                        <p className="text-xl font-bold text-[#111111]">{carpenterSpec.estimated_cost_range}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[#555555] mb-1">Build Time</p>
                        <p className="text-xl font-bold text-[#111111]">{carpenterSpec.build_time}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Google Search Section - Only shown after carpenter spec is generated */}
                <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-200 shadow-sm">
                  <CardContent className="p-6 md:p-8 space-y-4">
                    <div className="text-center">
                      <h3 className="text-sm font-bold text-[#111111] mb-2">
                        Need more options?
                      </h3>
                      <p className="text-xs text-[#666666] mb-4">
                        Search online for similar furniture pieces
                      </p>
                    </div>

                    {/* Google Search Button */}
                    <Button
                      onClick={() => window.open(getGoogleSearchUrl(buildRetailerQuery(item)), '_blank')}
                      variant="outline"
                      size="sm"
                      className="w-full bg-white hover:bg-gray-50 text-[#111111] border-gray-300 font-medium"
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Search the web (Google)
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            <div className="text-center mt-12">
              <Button
                size="lg"
                onClick={() => navigate(`/item-detection/${boardId}`)}
                className="bg-[#111111] hover:bg-[#333333] text-white rounded-full px-8"
              >
                Back to All Results
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Default view for non-Nigeria users OR non-buildable items (existing product search)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(`/item-detection/${boardId}`)}
              className="text-[#555555] hover:text-[#C89F7A]"
            >
              ← Back to Results
            </Button>
            
            {isAuthenticated && products.length > 0 && (
              <Button
                onClick={handleSaveAsChecklist}
                disabled={savingChecklist}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full gap-2"
              >
                <ListChecks className="h-4 w-4" />
                {savingChecklist ? 'Saving...' : 'Save as Checklist'}
              </Button>
            )}
          </div>

          {item && (
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 text-[#111111]">{item.item_name}</h1>
              <div className="flex justify-center gap-2 flex-wrap">
                <Badge className="bg-[#C89F7A] text-white">{item.category}</Badge>
                {item.style && <Badge variant="outline" className="border-[#C89F7A] text-[#C89F7A]">{item.style}</Badge>}
                {item.dominant_color && <Badge variant="outline">{item.dominant_color}</Badge>}
              </div>
              {item.description && (
                <p className="text-[#555555] mt-4 max-w-2xl mx-auto">{item.description}</p>
              )}
            </div>
          )}

          {products.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Card className="max-w-md mx-auto bg-gradient-to-br from-gray-50 to-white border-gray-200 shadow-sm">
                <CardContent className="p-8 text-center space-y-4">
                  <p className="text-base font-medium text-[#555555]">
                    Ready to shop this item?
                  </p>
                  <p className="text-sm text-[#666666]">
                    Tap below to continue your search.
                  </p>
                  
                  {/* Nigeria: Show "Share with a vendor" for non-furniture items */}
                  {showVendorShare && item && (
                    <Card className="bg-gradient-to-br from-[#C89F7A]/5 to-white border-[#C89F7A]/20 shadow-sm">
                      <CardContent className="p-6 space-y-4">
                        <div className="text-center">
                          <h3 className="text-sm font-bold text-[#111111] mb-2 uppercase tracking-wide">
                            SHARE WITH VENDORS
                          </h3>
                          <p className="text-xs text-[#666666] mb-4">
                            Generate a shareable image for Instagram or WhatsApp
                          </p>
                        </div>

                        <Button
                          onClick={() => setVendorShareModal({ isOpen: true, item })}
                          className="w-full bg-gradient-to-r from-[#C89F7A] to-[#B5896C] hover:from-[#B5896C] hover:to-[#C89F7A] text-white rounded-full font-semibold shadow-lg"
                          size="lg"
                        >
                          <Send className="h-5 w-5 mr-2" />
                          Share with a vendor
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Primary Retailer Buttons - Only show if allowed */}
                  {item && (
                    <div className="space-y-3">
                      {showWesternRetailers && (
                        <>
                          <p className="text-xs font-medium text-[#555555] uppercase tracking-wide">
                            Search on:
                          </p>
                          
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              onClick={() => handleRetailerClick(getAmazonSearchUrl, item.item_name)}
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white border border-[#FF9900] text-[#111111] hover:bg-[#FF9900]/10 font-medium"
                            >
                              Amazon
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>

                            <Button
                              onClick={() => handleRetailerClick(getWayfairSearchUrl, item.item_name)}
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white border border-[#7B2CBF] text-[#111111] hover:bg-[#7B2CBF]/10 font-medium"
                            >
                              Wayfair
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>

                            <Button
                              onClick={() => handleRetailerClick(getWalmartSearchUrl, item.item_name)}
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white border border-[#0071CE] text-[#111111] hover:bg-[#0071CE]/10 font-medium"
                            >
                              Walmart
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>
                          </div>

                          {/* Secondary Buttons */}
                          <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                            <Button
                              onClick={() => handleRetailerClick(getTemuSearchUrl, item.item_name)}
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white border border-[#FF7A00] text-[#555555] hover:bg-[#FF7A00]/10"
                            >
                              Temu
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>

                            <Button
                              onClick={() => handleRetailerClick(getSheinSearchUrl, item.item_name)}
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white border border-[#000000] text-[#555555] hover:bg-[#000000]/10"
                            >
                              Shein
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Google Search - Always show */}
                      <Button
                        onClick={() => window.open(getGoogleSearchUrl(item.item_name), '_blank')}
                        variant="outline"
                        size="sm"
                        className="w-full text-[#555555] hover:text-[#111111]"
                      >
                        <Search className="mr-2 h-4 w-4" />
                        Search the web (Google)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-xl transition-shadow rounded-3xl border-0">
                    <CardHeader className="p-0 relative">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.product_name}
                          className="w-full h-64 object-cover"
                        />
                      )}
                      {product.is_top_pick && (
                        <div className="absolute top-4 right-4 bg-[#C89F7A] text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Star className="h-3 w-3 fill-white" />
                          Top Pick
                        </div>
                      )}
                      {product.match_score && (
                        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          {Math.round(product.match_score * 100)}% Match
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="p-4">
                      <Badge className="mb-2 bg-stone-100 text-[#555555]">{product.merchant}</Badge>
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-[#111111]">
                        {product.product_name}
                      </h3>
                      {product.description && (
                        <p className="text-sm text-[#555555] mb-2 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold text-[#C89F7A]">
                          ${product.price.toFixed(2)}
                        </span>
                        {product.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium text-[#555555]">
                              {product.rating}
                            </span>
                            {product.review_count && (
                              <span className="text-sm text-[#555555]">
                                ({product.review_count})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-[#C89F7A] hover:bg-[#B5896C] text-white rounded-full"
                        onClick={() => window.open(product.product_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Product
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              {/* Search Options Section */}
              {item && (
                <div className="mt-12 text-center">
                  <Card className="max-w-md mx-auto bg-gradient-to-br from-gray-50 to-white border-gray-200 shadow-sm">
                    <CardContent className="p-6 space-y-4">
                      <p className="text-sm text-[#555555]">
                        Need more options? Find similar items below
                      </p>
                      
                      {/* Nigeria: Show "Share with a vendor" for non-furniture items */}
                      {showVendorShare && (
                        <Card className="bg-gradient-to-br from-[#C89F7A]/5 to-white border-[#C89F7A]/20 shadow-sm">
                          <CardContent className="p-6 space-y-4">
                            <div className="text-center">
                              <h3 className="text-sm font-bold text-[#111111] mb-2 uppercase tracking-wide">
                                SHARE WITH VENDORS
                              </h3>
                              <p className="text-xs text-[#666666] mb-4">
                                Generate a shareable image for Instagram or WhatsApp
                              </p>
                            </div>

                            <Button
                              onClick={() => setVendorShareModal({ isOpen: true, item })}
                              className="w-full bg-gradient-to-r from-[#C89F7A] to-[#B5896C] hover:from-[#B5896C] hover:to-[#C89F7A] text-white rounded-full font-semibold shadow-lg"
                              size="lg"
                            >
                              <Send className="h-5 w-5 mr-2" />
                              Share with a vendor
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                      
                      {showWesternRetailers && (
                        <>
                          <p className="text-xs font-medium text-[#555555] uppercase tracking-wide">
                            Search on:
                          </p>
                          
                          {/* Primary Retailer Buttons */}
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              onClick={() => handleRetailerClick(getAmazonSearchUrl, item.item_name)}
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white border border-[#FF9900] text-[#111111] hover:bg-[#FF9900]/10 font-medium"
                            >
                              Amazon
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>

                            <Button
                              onClick={() => handleRetailerClick(getWayfairSearchUrl, item.item_name)}
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white border border-[#7B2CBF] text-[-[#111111] hover:bg-[#7B2CBF]/10 font-medium"
                            >
                              Wayfair
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>

                            <Button
                              onClick={() => handleRetailerClick(getWalmartSearchUrl, item.item_name)}
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white border border-[#0071CE] text-[#111111] hover:bg-[#0071CE]/10 font-medium"
                            >
                              Walmart
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>
                          </div>

                          {/* Secondary Buttons */}
                          <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                            <Button
                              onClick={() => handleRetailerClick(getTemuSearchUrl, item.item_name)}
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white border border-[#FF7A00] text-[#555555] hover:bg-[#FF7A00]/10"
                            >
                              Temu
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>

                            <Button
                              onClick={() => handleRetailerClick(getSheinSearchUrl, item.item_name)}
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white border border-[#000000] text-[#555555] hover:bg-[#000000]/10"
                            >
                              Shein
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Google Search - Always show */}
                      <Button
                        onClick={() => window.open(getGoogleSearchUrl(item.item_name), '_blank')}
                        variant="outline"
                        size="sm"
                        className="w-full bg-gray-50 hover:bg-gray-100 text-[#111111] border-gray-200 font-medium"
                      >
                        <Search className="mr-2 h-4 w-4" />
                        Search the web (Google)
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}

          <div className="text-center mt-12">
            <Button
              size="lg"
              onClick={() => navigate(`/item-detection/${boardId}`)}
              className="bg-[#111111] hover:bg-[#333333] text-white rounded-full px-8"
            >
              Back to All Results
            </Button>
          </div>
        </div>
      </main>

      {vendorShareModal.item && board?.source_image_url && (
        <VendorShareModal
          isOpen={vendorShareModal.isOpen}
          onClose={() => setVendorShareModal({ isOpen: false, item: null })}
          item={vendorShareModal.item}
          inspirationImageUrl={board.source_image_url}
        />
      )}
    </div>
  );
}