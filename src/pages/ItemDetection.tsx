import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import Auth from '@/components/AuthModal';
import ShareModal from '@/components/ShareModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getDetectedItems, getBoards, searchProducts, getProductsForItem, getRandomSeedProducts, logAnalysis } from '@/lib/api';
import { DetectedItem, Product, Board } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ExternalLink, Star, Share2, Upload } from 'lucide-react';

// Helper function to validate product URL
function isValidProductUrl(url: string | undefined): boolean {
  if (!url) return false;
  
  // Check if URL starts with http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }
  
  // Check if URL contains placeholder IDs or patterns
  if (url.includes('XMAS') || url.includes('B09XMAS') || url.includes('xmas-')) {
    return false;
  }
  
  // Check for incomplete Amazon URLs (missing proper ASIN format)
  if (url.includes('amazon.ca/dp/')) {
    const asinMatch = url.match(/\/dp\/([A-Z0-9]+)/);
    if (!asinMatch) return false;
    const asin = asinMatch[1];
    // Valid ASIN is exactly 10 characters
    return asin.length === 10 && /^B[0-9A-Z]{9}$/.test(asin);
  }
  
  return true;
}

export default function ItemDetection() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [products, setProducts] = useState<Record<string, Product[]>>({});
  const [seedProducts, setSeedProducts] = useState<Product[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingSeedProducts, setLoadingSeedProducts] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
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
    if (!boardId) return;

    const loadData = async () => {
      try {
        // Load board info
        const boards = await getBoards();
        const currentBoard = boards.find((b) => b.id === boardId);
        if (currentBoard) {
          setBoard(currentBoard);
        }

        // Load detected items
        const detectedItems = await getDetectedItems(boardId);
        setItems(detectedItems);
        setLoading(false);

        // Check authentication status
        const { data: { user } } = await supabase.auth.getUser();
        const userIsAuthenticated = !!user;
        
        // Show auth modal after items are loaded ONLY if user is not authenticated
        if (detectedItems.length > 0 && !userIsAuthenticated) {
          setTimeout(() => setShowAuthModal(true), 1000);
          return; // Don't load products until authenticated
        }

        // Load products for each detected item (only if authenticated)
        if (detectedItems.length > 0 && userIsAuthenticated) {
          setLoadingProducts(true);
          const productsMap: Record<string, Product[]> = {};
          
          for (const item of detectedItems) {
            try {
              // First try to get existing products
              let itemProducts = await getProductsForItem(item.id);
              
              // If no products exist, trigger search
              if (itemProducts.length === 0) {
                itemProducts = await searchProducts(item.id);
              }
              
              // If still no products, try to get category-matched seed products
              if (itemProducts.length === 0) {
                const categorySeeds = await getRandomSeedProducts(item.item_name, item.category);
                // Take up to 3 seed products
                itemProducts = categorySeeds.slice(0, 3);
              }
              
              // Filter out products with invalid URLs
              const validProducts = itemProducts.filter(p => isValidProductUrl(p.product_url));
              productsMap[item.id] = validProducts;
            } catch (error) {
              console.error(`Failed to load products for item ${item.id}:`, error);
              productsMap[item.id] = [];
            }
          }
          
          setProducts(productsMap);
          setLoadingProducts(false);

          // Log analysis metrics
          const numberOfItemsDetected = detectedItems.length;
          const numberOfItemsWithProducts = Object.values(productsMap).filter(prods => prods.length > 0).length;
          const numberOfProductsShown = Object.values(productsMap).flat().length;
          
          await logAnalysis(boardId, numberOfItemsDetected, numberOfItemsWithProducts, numberOfProductsShown);

          // Check if any items have no products, then load additional seed products
          const hasItemsWithoutProducts = Object.values(productsMap).some(prods => prods.length === 0);
          if (hasItemsWithoutProducts) {
            setLoadingSeedProducts(true);
            try {
              const randomSeeds = await getRandomSeedProducts();
              // Filter seed products to only include those with valid URLs
              const validSeedProducts = randomSeeds.filter(p => isValidProductUrl(p.product_url));
              setSeedProducts(validSeedProducts);
            } catch (error) {
              console.error('Failed to load seed products:', error);
            }
            setLoadingSeedProducts(false);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load results');
        setLoading(false);
        setLoadingProducts(false);
      }
    };

    loadData();
  }, [boardId, isAuthenticated]);

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    setIsAuthenticated(true);
    
    // Reload products after authentication
    if (items.length > 0) {
      setLoadingProducts(true);
      const productsMap: Record<string, Product[]> = {};
      
      for (const item of items) {
        try {
          let itemProducts = await getProductsForItem(item.id);
          if (itemProducts.length === 0) {
            itemProducts = await searchProducts(item.id);
          }
          
          // If still no products, try to get category-matched seed products
          if (itemProducts.length === 0) {
            const categorySeeds = await getRandomSeedProducts(item.item_name, item.category);
            itemProducts = categorySeeds.slice(0, 3);
          }
          
          // Filter out products with invalid URLs
          const validProducts = itemProducts.filter(p => isValidProductUrl(p.product_url));
          productsMap[item.id] = validProducts;
        } catch (error) {
          console.error(`Failed to load products for item ${item.id}:`, error);
          productsMap[item.id] = [];
        }
      }
      
      setProducts(productsMap);
      setLoadingProducts(false);

      // Log analysis metrics
      if (boardId) {
        const numberOfItemsDetected = items.length;
        const numberOfItemsWithProducts = Object.values(productsMap).filter(prods => prods.length > 0).length;
        const numberOfProductsShown = Object.values(productsMap).flat().length;
        
        await logAnalysis(boardId, numberOfItemsDetected, numberOfItemsWithProducts, numberOfProductsShown);
      }

      // Load seed products if needed
      const hasItemsWithoutProducts = Object.values(productsMap).some(prods => prods.length === 0);
      if (hasItemsWithoutProducts) {
        setLoadingSeedProducts(true);
        try {
          const randomSeeds = await getRandomSeedProducts();
          // Filter seed products to only include those with valid URLs
          const validSeedProducts = randomSeeds.filter(p => isValidProductUrl(p.product_url));
          setSeedProducts(validSeedProducts);
        } catch (error) {
          console.error('Failed to load seed products:', error);
        }
        setLoadingSeedProducts(false);
      }
    }
  };

  // Calculate total look cost
  const calculateTotalCost = () => {
    const allProducts = Object.values(products).flat();
    if (allProducts.length === 0) return null;

    // Group products by item, get cheapest and average per item
    const itemPrices: { min: number; avg: number }[] = [];
    
    items.forEach(item => {
      const itemProducts = products[item.id] || [];
      if (itemProducts.length > 0) {
        const prices = itemProducts.map(p => p.price);
        const minPrice = Math.min(...prices);
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        itemPrices.push({ min: minPrice, avg: avgPrice });
      }
    });

    if (itemPrices.length === 0) return null;

    const totalMin = itemPrices.reduce((sum, p) => sum + p.min, 0);
    const totalAvg = itemPrices.reduce((sum, p) => sum + p.avg, 0);

    return {
      min: Math.round(totalMin),
      avg: Math.round(totalAvg),
    };
  };

  const totalCost = calculateTotalCost();

  // Check if there are any items without products
  const hasItemsWithoutProducts = items.some(item => {
    const itemProducts = products[item.id] || [];
    return itemProducts.length === 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <LoadingSpinner message="Analyzing your inspiration..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50">
      <Header />

      <main className="container mx-auto px-4 md:px-6 py-8 md:py-16">
        <div className="max-w-5xl mx-auto">
          {/* Header Section with Preview Image and Share Button */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6 mb-6">
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 md:mb-4 text-[#111111]">
                  We Found {items.length} Items in "{board?.name || 'Your Board'}"
                </h1>
                <p className="text-base md:text-lg text-[#555555]">
                  Here are affordable matches from top retailers
                </p>
              </div>
              
              <div className="flex items-center justify-center lg:justify-end gap-4 shrink-0">
                {/* Share Button - Top Right */}
                <Button
                  onClick={() => setShowShareModal(true)}
                  variant="outline"
                  size="sm"
                  className="border-[#C89F7A] text-[#C89F7A] hover:bg-[#C89F7A] hover:text-white"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>

                {/* Preview Thumbnail */}
                {board?.source_image_url && (
                  <img
                    src={board.source_image_url}
                    alt="Inspiration"
                    className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-2xl shadow-lg border-2 border-white"
                  />
                )}
              </div>
            </div>

            {/* Single Primary CTA - Always visible */}
            <div className="flex justify-center mb-6">
              <Button
                onClick={() => navigate('/upload')}
                className="bg-[#111111] hover:bg-[#333333] text-white rounded-full px-6 md:px-8 text-sm md:text-base"
                size="lg"
              >
                <Upload className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Analyze Another Inspiration
              </Button>
            </div>

            {/* Summary Strip - Detected Items Pills */}
            {items.length > 0 && (
              <div className="flex flex-col md:flex-row md:flex-wrap md:justify-center gap-3 mb-6 md:mb-8">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-full px-4 md:px-6 py-3 shadow-md border border-gray-200 flex items-center justify-between md:justify-start gap-3"
                  >
                    <span className="font-semibold text-sm md:text-base text-[#111111] flex-1 md:flex-none">
                      {item.item_name}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge className="bg-[#C89F7A] text-white text-xs">
                        {item.category}
                      </Badge>
                      {item.confidence && (
                        <span className="text-xs md:text-sm text-[#555555]">
                          {Math.round(item.confidence * 100)}% match
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total Look Cost Card */}
            {totalCost && !loadingProducts && isAuthenticated && (
              <div className="flex justify-center mb-6 md:mb-8">
                <Card className="w-full md:w-auto bg-gradient-to-br from-[#C89F7A]/10 to-[#C89F7A]/5 border-[#C89F7A]/30">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                      <div className="text-center md:text-left w-full md:w-auto">
                        <p className="text-xs md:text-sm text-[#555555] mb-1">Total Look Cost from:</p>
                        <p className="text-2xl md:text-3xl font-bold text-[#111111]">${totalCost.min.toLocaleString()}</p>
                      </div>
                      <div className="hidden md:block h-12 w-px bg-[#C89F7A]/30"></div>
                      <div className="w-full md:hidden h-px bg-[#C89F7A]/30"></div>
                      <div className="text-center md:text-left w-full md:w-auto">
                        <p className="text-xs md:text-sm text-[#555555] mb-1">Average Look Cost:</p>
                        <p className="text-2xl md:text-3xl font-bold text-[#111111]">${totalCost.avg.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Products Section */}
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#555555] mb-4">
                No items detected. Please try uploading a different image.
              </p>
            </div>
          ) : !isAuthenticated ? (
            <div className="text-center py-12">
              <p className="text-lg text-[#555555] mb-4">
                Sign in to see your personalized product matches
              </p>
            </div>
          ) : loadingProducts ? (
            <div className="space-y-12 md:space-y-16">
              {items.map((item) => (
                <div key={item.id} className="space-y-6">
                  {/* Item Section Header */}
                  <div className="text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-[#111111] mb-2">
                      {item.item_name}
                    </h2>
                    {item.description && (
                      <p className="text-sm md:text-base text-[#555555] mb-2">{item.description}</p>
                    )}
                  </div>

                  {/* Skeleton Loaders for Products */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {[1, 2, 3].map((n) => (
                      <Card key={n} className="overflow-hidden rounded-3xl border-0 shadow-lg">
                        <Skeleton className="aspect-square w-full" />
                        <CardContent className="p-4 md:p-6 space-y-3">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                          <div className="flex justify-between items-center">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-8 w-16" />
                          </div>
                          <Skeleton className="h-10 w-full rounded-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-12 md:space-y-16">
                {items.map((item) => {
                  const itemProducts = products[item.id] || [];

                  return (
                    <div key={item.id} className="space-y-6">
                      {/* Item Section Header */}
                      <div className="text-center">
                        <h2 className="text-2xl md:text-3xl font-bold text-[#111111] mb-2">
                          {item.item_name}
                        </h2>
                        {item.description && (
                          <p className="text-sm md:text-base text-[#555555] mb-2">{item.description}</p>
                        )}
                        <div className="flex justify-center gap-2 flex-wrap">
                          {item.style && (
                            <Badge variant="outline" className="text-xs md:text-sm">{item.style}</Badge>
                          )}
                          {item.dominant_color && (
                            <Badge variant="outline" className="text-xs md:text-sm">{item.dominant_color}</Badge>
                          )}
                          {item.materials && item.materials.length > 0 && (
                            <Badge variant="outline" className="text-xs md:text-sm">{item.materials.join(', ')}</Badge>
                          )}
                        </div>
                      </div>

                      {/* Product Grid */}
                      {itemProducts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                          {itemProducts.map((product) => (
                            <Card
                              key={product.id}
                              className={`overflow-hidden rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all ${
                                product.is_top_pick ? 'ring-2 ring-[#C89F7A]' : ''
                              }`}
                            >
                              <div className="relative aspect-square overflow-hidden bg-gray-100">
                                <img
                                  src={product.image_url}
                                  alt={product.product_name}
                                  className="w-full h-full object-cover"
                                />
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
                                {product.is_seed && (
                                  <div className="absolute bottom-4 left-4 bg-white/90 text-[#555555] px-3 py-1 rounded-full text-xs font-medium">
                                    Similar to your inspiration
                                  </div>
                                )}
                              </div>

                              <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                                <h3 className="text-base md:text-lg font-semibold text-[#111111] line-clamp-2">
                                  {product.product_name}
                                </h3>

                                {product.description && (
                                  <p className="text-xs md:text-sm text-[#555555] line-clamp-2">
                                    {product.description}
                                  </p>
                                )}

                                <div className="flex items-center justify-between">
                                  <Badge variant="outline" className="text-xs text-[#555555]">
                                    {product.merchant}
                                  </Badge>
                                  <span className="text-xl md:text-2xl font-bold text-[#111111]">
                                    ${product.price}
                                  </span>
                                </div>

                                {product.rating && (
                                  <div className="flex items-center gap-2 text-xs md:text-sm text-[#555555]">
                                    <span className="flex items-center">
                                      ⭐ {product.rating}
                                    </span>
                                    {product.review_count && (
                                      <span>({product.review_count} reviews)</span>
                                    )}
                                  </div>
                                )}

                                <Button
                                  className="w-full bg-[#111111] hover:bg-[#333333] text-white rounded-full text-sm md:text-base"
                                  onClick={() => window.open(product.product_url, '_blank')}
                                >
                                  View Product
                                  <ExternalLink className="ml-2 h-3 w-3 md:h-4 md:w-4" />
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 px-4">
                          <p className="text-base font-semibold text-[#111111] mb-2">
                            We could not find a shoppable match for this look yet
                          </p>
                          <p className="text-sm text-[#555555]">
                            We are still stocking our catalogue. You can try a different photo or come back soon.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* See More Products Section - Only show if there are items without products AND we have valid seed products */}
              {hasItemsWithoutProducts && seedProducts.length > 0 && (
                <div className="mt-16 space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-[#111111] mb-2">
                      See more products
                    </h2>
                    <p className="text-sm md:text-base text-[#555555]">
                      Explore our curated collection of home decor items
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
                    {seedProducts.map((product) => (
                      <Card
                        key={product.id}
                        className="overflow-hidden rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all"
                      >
                        <div className="relative aspect-square overflow-hidden bg-gray-100">
                          <img
                            src={product.image_url}
                            alt={product.product_name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-3 left-3 bg-white/90 text-[#555555] px-2 py-1 rounded-full text-xs font-medium">
                            Similar to your inspiration
                          </div>
                        </div>

                        <CardContent className="p-4 space-y-3">
                          <h3 className="text-sm font-semibold text-[#111111] line-clamp-2">
                            {product.product_name}
                          </h3>

                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs text-[#555555]">
                              {product.merchant}
                            </Badge>
                            <span className="text-lg font-bold text-[#111111]">
                              ${product.price}
                            </span>
                          </div>

                          <Button
                            className="w-full bg-[#111111] hover:bg-[#333333] text-white rounded-full text-sm"
                            size="sm"
                            onClick={() => window.open(product.product_url, '_blank')}
                          >
                            View Product
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading state for seed products */}
              {hasItemsWithoutProducts && loadingSeedProducts && (
                <div className="mt-16 space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-[#111111] mb-2">
                      See more products
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <Card key={n} className="overflow-hidden rounded-3xl border-0 shadow-lg">
                        <Skeleton className="aspect-square w-full" />
                        <CardContent className="p-4 space-y-3">
                          <Skeleton className="h-4 w-3/4" />
                          <div className="flex justify-between items-center">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-6 w-12" />
                          </div>
                          <Skeleton className="h-8 w-full rounded-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Share Section */}
              <div className="mt-12 md:mt-16 text-center">
                <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-200">
                  <CardContent className="p-6 md:p-8">
                    <h3 className="text-xl md:text-2xl font-bold text-[#111111] mb-2 md:mb-3">
                      Love what you're building?
                    </h3>
                    <p className="text-sm md:text-base text-[#555555] mb-4 md:mb-6">
                      Share your inspiration board with friends and family
                    </p>
                    <Button
                      onClick={() => setShowShareModal(true)}
                      className="bg-[#111111] hover:bg-[#333333] text-white rounded-full px-6 md:px-8 text-sm md:text-base"
                      size="lg"
                    >
                      <Share2 className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                      Share what you're building ✨
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Footer Disclaimer */}
          <footer className="mt-16 text-center">
            <p className="text-xs text-[#888888] leading-relaxed">
              Homable Creations provides product recommendations but is not responsible for pricing changes, 
              product availability, or fulfillment by third-party retailers.
            </p>
          </footer>
        </div>
      </main>

      {/* Auth Modal Overlay - Only show if NOT authenticated */}
      {showAuthModal && !isAuthenticated && (
        <Auth onSuccess={handleAuthSuccess} redirectPath={`/item-detection/${boardId}`} />
      )}

      {/* Share Modal */}
      {board && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          boardId={board.id}
          boardName={board.name}
        />
      )}
    </div>
  );
}