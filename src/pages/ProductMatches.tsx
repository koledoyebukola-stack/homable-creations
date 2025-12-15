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

  const createGoogleSearchUrl = (productTitle: string) => {
    const encodedTitle = encodeURIComponent(productTitle);
    return `https://www.google.com/search?q=${encodedTitle}`;
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
                  
                  {/* Primary Google Search Button */}
                  {item && (
                    <Button
                      onClick={() => window.open(createGoogleSearchUrl(item.item_name), '_blank')}
                      variant="outline"
                      className="rounded-full border-2 border-[#333333] text-[#333333] hover:bg-[#333333] hover:text-white"
                      size="sm"
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Search this item on Google
                    </Button>
                  )}

                  {/* Helper Text - Three Lines */}
                  <div className="text-xs text-[#666666] pt-2 space-y-0.5">
                    <p>Also search on</p>
                    <p>Amazon or Temu will open the site and copy the item name to your clipboard.</p>
                    <p>Paste it into the search bar to see results.</p>
                  </div>

                  {/* Secondary Affiliate Buttons with Toned Down Brand Colors */}
                  {item && (
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        onClick={() => handleAffiliateClick(item.item_name, 'https://amzn.to/48O0yS5', 'Amazon')}
                        variant="outline"
                        size="sm"
                        className="rounded-full bg-white border border-[#FF9900] text-[#111111] hover:bg-[#FF9900]/10"
                      >
                        <svg className="mr-1.5 h-3.5 w-3.5 text-[#FF9900]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726-1.53.406-3.045.61-4.516.61-2.265 0-4.463-.42-6.608-1.27-2.14-.85-4.018-1.995-5.624-3.44-.1-.094-.155-.2-.164-.315-.007-.09.03-.17.12-.232zm23.71-1.27c-.18-.232-.48-.26-.89-.08-.41.18-.89.44-1.44.78-.55.34-1.05.63-1.51.87-.46.24-.87.42-1.23.54-.36.12-.62.18-.78.18-.26 0-.39-.12-.39-.36 0-.14.04-.28.12-.42.08-.14.2-.28.36-.42.16-.14.34-.28.54-.42.2-.14.42-.28.66-.42.24-.14.48-.28.72-.42.24-.14.47-.28.69-.42.22-.14.42-.28.6-.42.18-.14.33-.28.45-.42.12-.14.18-.28.18-.42 0-.26-.12-.39-.36-.39-.14 0-.32.04-.54.12-.22.08-.46.2-.72.36-.26.16-.54.36-.84.6-.3.24-.6.52-.9.84-.3.32-.58.68-.84 1.08-.26.4-.48.84-.66 1.32-.18.48-.27.98-.27 1.5 0 .52.09.98.27 1.38.18.4.42.74.72 1.02.3.28.66.5 1.08.66.42.16.88.24 1.38.24.5 0 1.02-.08 1.56-.24.54-.16 1.08-.38 1.62-.66.54-.28 1.06-.6 1.56-.96.5-.36.96-.74 1.38-1.14.42-.4.78-.82 1.08-1.26.3-.44.54-.88.72-1.32.18-.44.27-.88.27-1.32 0-.44-.09-.82-.27-1.14z"/>
                        </svg>
                        Amazon
                      </Button>

                      <Button
                        onClick={() => handleAffiliateClick(item.item_name, 'https://temu.to/k/gqp71mgrtku', 'Temu')}
                        variant="outline"
                        size="sm"
                        className="rounded-full bg-white border border-[#FF7A00] text-[#111111] hover:bg-[#FF7A00]/10"
                      >
                        <svg className="mr-1.5 h-3.5 w-3.5 text-[#FF7A00]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        Temu
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
                      
                      {/* Primary Google Search Button */}
                      <Button
                        onClick={() => window.open(createGoogleSearchUrl(item.item_name), '_blank')}
                        variant="outline"
                        className="rounded-full"
                        size="sm"
                      >
                        <Search className="mr-2 h-4 w-4" />
                        Search on Google
                      </Button>

                      {/* Helper Text - Three Lines */}
                      <div className="text-xs text-[#666666] space-y-0.5">
                        <p>Also search on</p>
                        <p>Amazon or Temu will open the site and copy the item name to your clipboard.</p>
                        <p>Paste it into the search bar to see results.</p>
                      </div>

                      {/* Secondary Affiliate Buttons with Toned Down Brand Colors */}
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button
                          onClick={() => handleAffiliateClick(item.item_name, 'https://amzn.to/48O0yS5', 'Amazon')}
                          variant="outline"
                          size="sm"
                          className="rounded-full bg-white border border-[#FF9900] text-[#111111] hover:bg-[#FF9900]/10"
                        >
                          <svg className="mr-1.5 h-3.5 w-3.5 text-[#FF9900]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726-1.53.406-3.045.61-4.516.61-2.265 0-4.463-.42-6.608-1.27-2.14-.85-4.018-1.995-5.624-3.44-.1-.094-.155-.2-.164-.315-.007-.09.03-.17.12-.232zm23.71-1.27c-.18-.232-.48-.26-.89-.08-.41.18-.89.44-1.44.78-.55.34-1.05.63-1.51.87-.46.24-.87.42-1.23.54-.36.12-.62.18-.78.18-.26 0-.39-.12-.39-.36 0-.14.04-.28.12-.42.08-.14.2-.28.36-.42.16-.14.34-.28.54-.42.2-.14.42-.28.66-.42.24-.14.48-.28.72-.42.24-.14.47-.28.69-.42.22-.14.42-.28.6-.42.18-.14.33-.28.45-.42.12-.14.18-.28.18-.42 0-.26-.12-.39-.36-.39-.14 0-.32.04-.54.12-.22.08-.46.2-.72.36-.26.16-.54.36-.84.6-.3.24-.6.52-.9.84-.3.32-.58.68-.84 1.08-.26.4-.48.84-.66 1.32-.18.48-.27.98-.27 1.5 0 .52.09.98.27 1.38.18.4.42.74.72 1.02.3.28.66.5 1.08.66.42.16.88.24 1.38.24.5 0 1.02-.08 1.56-.24.54-.16 1.08-.38 1.62-.66.54-.28 1.06-.6 1.56-.96.5-.36.96-.74 1.38-1.14.42-.4.78-.82 1.08-1.26.3-.44.54-.88.72-1.32.18-.44.27-.88.27-1.32 0-.44-.09-.82-.27-1.14z"/>
                          </svg>
                          Amazon
                        </Button>

                        <Button
                          onClick={() => handleAffiliateClick(item.item_name, 'https://temu.to/k/gqp71mgrtku', 'Temu')}
                          variant="outline"
                          size="sm"
                          className="rounded-full bg-white border border-[#FF7A00] text-[#111111] hover:bg-[#FF7A00]/10"
                        >
                          <svg className="mr-1.5 h-3.5 w-3.5 text-[#FF7A00]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          Temu
                        </Button>
                      </div>
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