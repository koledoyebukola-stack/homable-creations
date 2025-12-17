import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { getProductsForItem, searchProducts, getDetectedItems, createChecklist } from '@/lib/api';
import { Product, DetectedItem } from '@/lib/types';
import { toast } from 'sonner';
import { ExternalLink, Star, Upload, ListChecks, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  getAmazonSearchUrl, 
  getWalmartSearchUrl, 
  getWayfairSearchUrl, 
  getTemuSearchUrl, 
  getSheinSearchUrl,
  getGoogleSearchUrl 
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

export default function ProductMatches() {
  const { boardId, itemId } = useParams<{ boardId: string; itemId: string }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [item, setItem] = useState<DetectedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
        const items = await getDetectedItems(boardId);
        const currentItem = items.find((i) => i.id === itemId);
        if (currentItem) {
          setItem(currentItem);
        }

        // Try to get existing products first
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

  if (loading || searching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <LoadingSpinner
            message={
              searching ? 'Finding the best deals...' : 'Loading products...'
            }
          />
        </main>
      </div>
    );
  }

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
                  
                  {/* Primary Retailer Buttons */}
                  {item && (
                    <div className="space-y-3">
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

                      {/* Google Search */}
                      <Button
                        onClick={() => window.open(getGoogleSearchUrl(item.item_name), '_blank')}
                        variant="ghost"
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

                      {/* Google Search */}
                      <Button
                        onClick={() => window.open(getGoogleSearchUrl(item.item_name), '_blank')}
                        variant="ghost"
                        size="sm"
                        className="w-full text-[#555555] hover:text-[#111111]"
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
    </div>
  );
}