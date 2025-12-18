import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LoadingSpinner from '@/components/LoadingSpinner';
import Auth from '@/components/AuthModal';
import ShareModal from '@/components/ShareModal';
import VisualSearchModal from '@/components/VisualSearchModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getDetectedItems, getBoardById, getBoards, searchProducts, getProductsForItem, getRandomSeedProducts, logAnalysis, createChecklist, getChecklistByBoardId, seeMoreItems } from '@/lib/api';
import { DetectedItem, Product, Board, Checklist } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ExternalLink, Star, Share2, Upload, Search, ListChecks, Eye, Camera } from 'lucide-react';
import { 
  getAmazonSearchUrl, 
  getWalmartSearchUrl, 
  getWayfairSearchUrl, 
  getTemuSearchUrl, 
  getSheinSearchUrl,
  getGoogleSearchUrl,
  buildRetailerQuery
} from '@/lib/retailer-utils';

// 1. Define the interface for the full Search Response object (assumed to be the return type of searchProducts)
interface SearchResponse {
  products: Product[];
  message: string | null;
  message_category_context: string | null;
}

// 2. Define the structure for the Product map value to unify product data or message
type ItemProductResult = SearchResponse;

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

// Helper function to handle async retailer button clicks with normalized query
async function handleRetailerClick(getUrlFn: (query: string) => Promise<string>, item: DetectedItem) {
  try {
    const normalizedQuery = buildRetailerQuery(item);
    const url = await getUrlFn(normalizedQuery);
    window.open(url, '_blank');
  } catch (error) {
    console.error('Failed to generate retailer URL:', error);
    toast.error('Failed to open retailer link');
  }
}

export default function ItemDetection() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [products, setProducts] = useState<Record<string, ItemProductResult>>({});
  const [seedProducts, setSeedProducts] = useState<Product[]>([]);
  const [additionalProducts, setAdditionalProducts] = useState<Product[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [existingChecklist, setExistingChecklist] = useState<Checklist | null>(null);
  const [roomMaterials, setRoomMaterials] = useState<{ walls?: string; floors?: string } | null>(null);
  const [showRoomMaterials, setShowRoomMaterials] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingSeedProducts, setLoadingSeedProducts] = useState(false);
  const [loadingAdditionalProducts, setLoadingAdditionalProducts] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [loadingMoreItems, setLoadingMoreItems] = useState(false);
  const [visualSearchModal, setVisualSearchModal] = useState<{
    isOpen: boolean;
    item: DetectedItem | null;
  }>({ isOpen: false, item: null });
  
  // Refs for scrolling to item sections
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToItem = (itemId: string) => {
    const element = itemRefs.current[itemId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
        // Load board info directly by boardId (works for both authenticated and non-authenticated users)
        const currentBoard = await getBoardById(boardId);
        if (currentBoard) {
          setBoard(currentBoard);
          // Set room materials if available
          if (currentBoard.room_materials) {
            setRoomMaterials(currentBoard.room_materials);
          }
        }

        // Load detected items
        const detectedItems = await getDetectedItems(boardId);
        setItems(detectedItems);
        setLoading(false);

        // Check authentication status
        const { data: { user } } = await supabase.auth.getUser();
        const userIsAuthenticated = !!user;
        
        // Check if board has existing checklist
        if (userIsAuthenticated && boardId) {
          const checklist = await getChecklistByBoardId(boardId);
          setExistingChecklist(checklist);
        }
        
        // Show auth modal after items are loaded ONLY if user is not authenticated
        if (detectedItems.length > 0 && !userIsAuthenticated) {
          setTimeout(() => setShowAuthModal(true), 1000);
          return; // Don't load products until authenticated
        }

        // Load products for each detected item (only if authenticated)
        if (detectedItems.length > 0 && userIsAuthenticated) {
          setLoadingProducts(true);
          const productsMap: Record<string, ItemProductResult> = {};
          
          for (const item of detectedItems) {
            try {
              // 1. First try to get existing products (returns Product[])
              const productsFromCache = await getProductsForItem(item.id);
              let result: ItemProductResult = { products: productsFromCache, message: null, message_category_context: null };
              
              // 2. If no products exist, trigger search (returns SearchResponse object)
              if (result.products.length === 0) {
                const searchResult = await searchProducts(item.id);
                result = searchResult;
              }
              
              // 3. If there is no message AND still no products, try to get category-matched seed products
              if (!result.message && result.products.length === 0) {
                const categorySeeds = await getRandomSeedProducts(item.item_name, item.category);
                result.products = categorySeeds.slice(0, 3);
              }
              
              // 4. Filter products and store the final result
              if (!result.message) {
                result.products = result.products.filter(p => isValidProductUrl(p.product_url));
              }

              productsMap[item.id] = result;
            } catch (error) {
              console.error(`Failed to load products for item ${item.id}:`, error);
              productsMap[item.id] = { products: [], message: null, message_category_context: null };
            }
          }
          
          setProducts(productsMap);
          setLoadingProducts(false);

          // Log analysis metrics
          const numberOfItemsDetected = detectedItems.length;
          const numberOfItemsWithProducts = Object.values(productsMap).filter(r => !r.message && r.products.length > 0).length;
          const numberOfProductsShown = Object.values(productsMap).filter(r => !r.message).flatMap(r => r.products).length;
          
          await logAnalysis(boardId, numberOfItemsDetected, numberOfItemsWithProducts, numberOfProductsShown);

          // Check if any items have no products AND no message, then load additional seed products
          const hasItemsWithoutProducts = Object.values(productsMap).some(r => !r.message && r.products.length === 0);
          if (hasItemsWithoutProducts) {
            setLoadingSeedProducts(true);
            try {
              const randomSeeds = await getRandomSeedProducts();
              const validSeedProducts = randomSeeds.filter(p => isValidProductUrl(p.product_url));
              setSeedProducts(validSeedProducts);
            } catch (error) {
              console.error('Failed to load seed products:', error);
            }
            setLoadingSeedProducts(false);
          }

          // Load additional products for "More pieces you can shop today" section
          setLoadingAdditionalProducts(true);
          try {
            const matchedProductIds = new Set(
              Object.values(productsMap)
                .filter(r => !r.message)
                .flatMap(r => r.products)
                .map(p => p.id)
            );

            const allSeedProducts = await getRandomSeedProducts();
            const uniqueAdditionalProducts = allSeedProducts.filter(
              p => !matchedProductIds.has(p.id) && isValidProductUrl(p.product_url)
            );

            setAdditionalProducts(uniqueAdditionalProducts.slice(0, 10));
          } catch (error) {
            console.error('Failed to load additional products:', error);
          }
          setLoadingAdditionalProducts(false);
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
    
    // Check if board has existing checklist
    if (boardId) {
      const checklist = await getChecklistByBoardId(boardId);
      setExistingChecklist(checklist);
    }
    
    // Reload products after authentication
    if (items.length > 0) {
      setLoadingProducts(true);
      const productsMap: Record<string, ItemProductResult> = {};
      
      for (const item of items) {
        try {
          const productsFromCache = await getProductsForItem(item.id);
          let result: ItemProductResult = { products: productsFromCache, message: null, message_category_context: null };

          if (result.products.length === 0) {
            const searchResult = await searchProducts(item.id);
            result = searchResult;
          }
          
          if (!result.message && result.products.length === 0) {
            const categorySeeds = await getRandomSeedProducts(item.item_name, item.category);
            result.products = categorySeeds.slice(0, 3);
          }
          
          if (!result.message) {
            result.products = result.products.filter(p => isValidProductUrl(p.product_url));
          }
          
          productsMap[item.id] = result;
        } catch (error) {
          console.error(`Failed to load products for item ${item.id}:`, error);
          productsMap[item.id] = { products: [], message: null, message_category_context: null };
        }
      }
      
      setProducts(productsMap);
      setLoadingProducts(false);

      if (boardId) {
        const numberOfItemsDetected = items.length;
        const numberOfItemsWithProducts = Object.values(productsMap).filter(r => !r.message && r.products.length > 0).length;
        const numberOfProductsShown = Object.values(productsMap).filter(r => !r.message).flatMap(r => r.products).length;
        
        await logAnalysis(boardId, numberOfItemsDetected, numberOfItemsWithProducts, numberOfProductsShown);
      }

      const hasItemsWithoutProducts = Object.values(productsMap).some(r => !r.message && r.products.length === 0);
      if (hasItemsWithoutProducts) {
        setLoadingSeedProducts(true);
        try {
          const randomSeeds = await getRandomSeedProducts();
          const validSeedProducts = randomSeeds.filter(p => isValidProductUrl(p.product_url));
          setSeedProducts(validSeedProducts);
        } catch (error) {
          console.error('Failed to load seed products:', error);
        }
        setLoadingSeedProducts(false);
      }

      setLoadingAdditionalProducts(true);
      try {
        const matchedProductIds = new Set(
          Object.values(productsMap)
            .filter(r => !r.message)
            .flatMap(r => r.products)
            .map(p => p.id)
        );

        const allSeedProducts = await getRandomSeedProducts();
        const uniqueAdditionalProducts = allSeedProducts.filter(
          p => !matchedProductIds.has(p.id) && isValidProductUrl(p.product_url)
        );

        setAdditionalProducts(uniqueAdditionalProducts.slice(0, 10));
      } catch (error) {
        console.error('Failed to load additional products:', error);
      }
      setLoadingAdditionalProducts(false);
    }
  };

  const handleSaveAsChecklist = async () => {
    if (!boardId || items.length === 0) return;

    if (!isAuthenticated) {
      toast.error('Please sign in to save shopping lists');
      setShowAuthModal(true);
      return;
    }

    try {
      setSavingChecklist(true);
      
      // Create checklist with all detected items
      const checklistName = `${board?.name || 'My Board'} – Shopping List`;
      const itemNames = items.map(item => item.item_name);

      const checklist = await createChecklist(checklistName, boardId, itemNames);
      
      toast.success('Shopping list created! 🎉');
      navigate(`/checklists/${checklist.id}`);
    } catch (error: unknown) {
      console.error('Failed to create shopping list:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create shopping list');
    } finally {
      setSavingChecklist(false);
    }
  };

  const handleSeeMoreItems = async () => {
    if (!boardId) return;

    try {
      setLoadingMoreItems(true);
      const result = await seeMoreItems(boardId);
      
      if (result.new_items_count === 0) {
        toast.info('No additional items found in this image');
        setLoadingMoreItems(false);
        return;
      }

      // Update room materials if returned
      if (result.room_materials) {
        setRoomMaterials(result.room_materials);
        setShowRoomMaterials(true);
      }

      // Reload all items
      const allItems = await getDetectedItems(boardId);
      setItems(allItems);
      
      toast.success(`Found ${result.new_items_count} more item${result.new_items_count > 1 ? 's' : ''}! 🎉`);
      
      // Reload products for new items
      setLoadingProducts(true);
      const productsMap: Record<string, ItemProductResult> = { ...products };
      
      for (const item of result.detected_items) {
        try {
          const productsFromCache = await getProductsForItem(item.id);
          let itemResult: ItemProductResult = { products: productsFromCache, message: null, message_category_context: null };

          if (itemResult.products.length === 0) {
            const searchResult = await searchProducts(item.id);
            itemResult = searchResult;
          }
          
          if (!itemResult.message && itemResult.products.length === 0) {
            const categorySeeds = await getRandomSeedProducts(item.item_name, item.category);
            itemResult.products = categorySeeds.slice(0, 3);
          }
          
          if (!itemResult.message) {
            itemResult.products = itemResult.products.filter(p => isValidProductUrl(p.product_url));
          }
          
          productsMap[item.id] = itemResult;
        } catch (error) {
          console.error(`Failed to load products for item ${item.id}:`, error);
          productsMap[item.id] = { products: [], message: null, message_category_context: null };
        }
      }
      
      setProducts(productsMap);
      setLoadingProducts(false);
    } catch (error) {
      console.error('Failed to see more items:', error);
      toast.error('Failed to find more items');
    } finally {
      setLoadingMoreItems(false);
    }
  };

  const calculateTotalCost = () => {
    const allProducts = Object.values(products).filter(r => !r.message).flatMap(r => r.products).flat();
    if (allProducts.length === 0) return null;

    const itemPrices: { min: number; avg: number }[] = [];
    
    items.forEach(item => {
      const itemResult = products[item.id];
      if (itemResult && !itemResult.message) {
        const itemProducts = itemResult.products || [];
        if (itemProducts.length > 0) {
          const prices = itemProducts.map(p => p.price);
          const minPrice = Math.min(...prices);
          const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
          itemPrices.push({ min: minPrice, avg: avgPrice });
        }
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

  const hasItemsWithoutProducts = items.some(item => {
    const itemResult = products[item.id];
    return itemResult && !itemResult.message && itemResult.products.length === 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <LoadingSpinner message="Analyzing your inspiration..." />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8 md:py-16">
        <div className="max-w-6xl mx-auto">
          {/* SECTION 1: Inspiration Header (Hero) */}
          <div className="mb-12">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Large Photo on the Left */}
              {board?.source_image_url && (
                <div className="w-full lg:w-2/5 shrink-0">
                  <img
                    src={board.source_image_url}
                    alt="Your Inspiration"
                    className="w-full h-auto rounded-3xl shadow-2xl border-4 border-white object-cover"
                  />
                </div>
              )}

              {/* Right Side Copy & CTAs */}
              <div className="flex-1 space-y-6">
                <div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 text-[#111111]">
                    We Found {items.length} Items in "{board?.name || 'Your Board'}"
                  </h1>
                  <p className="text-lg md:text-xl text-[#555555]">
                    Here are the key decor pieces identified in your inspiration photo.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {isAuthenticated && items.length > 0 && (
                    <>
                      {existingChecklist ? (
                        <Button
                          onClick={() => navigate(`/checklists/${existingChecklist.id}`)}
                          className="bg-[#2F9E44] hover:bg-[#2F9E44]/90 text-white font-bold rounded-full px-8 py-6 text-base shadow-lg hover:shadow-xl transition-all"
                          size="lg"
                        >
                          <ListChecks className="h-5 w-5 mr-2" />
                          View Shopping List
                        </Button>
                      ) : (
                        <Button
                          onClick={handleSaveAsChecklist}
                          disabled={savingChecklist}
                          className="bg-black hover:bg-black/90 text-white font-bold rounded-full px-8 py-6 text-base shadow-lg hover:shadow-xl transition-all"
                          size="lg"
                        >
                          <ListChecks className="h-5 w-5 mr-2" />
                          {savingChecklist ? 'Saving...' : 'Save as Shopping List'}
                        </Button>
                      )}
                    </>
                  )}

                  <Button
                    onClick={() => navigate('/upload')}
                    variant="outline"
                    className="border-2 border-[#CACACA] text-[#555555] hover:bg-gray-50 hover:border-[#999999] rounded-full px-6 transition-all"
                    size="lg"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Analyze Another Inspiration
                  </Button>
                </div>

                {/* SECTION 2: Design Summary (Desktop Only - in white space) */}
                {items.length > 0 && (
                  <div className="hidden lg:block">
                    <Card className="bg-gradient-to-br from-[#C89F7A]/5 to-white border-[#C89F7A]/20 shadow-md">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <h2 className="text-xl font-bold text-[#111111]">
                            Your Space Summary
                          </h2>
                          {isAuthenticated && (
                            <Button
                              onClick={handleSeeMoreItems}
                              disabled={loadingMoreItems}
                              variant="ghost"
                              size="sm"
                              className="text-[#C89F7A] hover:text-[#C89F7A] hover:bg-[#C89F7A]/10 -mt-1"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {loadingMoreItems ? 'Searching...' : 'See More Items'}
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-[#555555] mb-3">
                          We identified the main elements featured in your inspiration:
                        </p>
                        <ul className="grid grid-cols-1 gap-2">
                          {items.map((item) => (
                            <li key={item.id} className="flex items-center text-[#333333] text-sm">
                              <span className="text-[#C89F7A] mr-2">•</span>
                              <span className="capitalize">{item.item_name}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Room Materials Card (Desktop) */}
                    {showRoomMaterials && roomMaterials && (roomMaterials.walls || roomMaterials.floors) && (
                      <Card className="bg-gradient-to-br from-[#C89F7A]/5 to-white border-[#C89F7A]/20 shadow-md mt-4">
                        <CardContent className="p-6">
                          <h2 className="text-xl font-bold text-[#111111] mb-3">
                            Room Materials
                          </h2>
                          <div className="space-y-2">
                            {roomMaterials.walls && (
                              <div className="flex items-start">
                                <span className="text-[#C89F7A] mr-2 mt-1">•</span>
                                <div>
                                  <span className="font-semibold text-[#333333]">Walls: </span>
                                  <span className="text-[#555555]">{roomMaterials.walls}</span>
                                </div>
                              </div>
                            )}
                            {roomMaterials.floors && (
                              <div className="flex items-start">
                                <span className="text-[#C89F7A] mr-2 mt-1">•</span>
                                <div>
                                  <span className="font-semibold text-[#333333]">Floors: </span>
                                  <span className="text-[#555555]">{roomMaterials.floors}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: Design Summary (Mobile Only - full width) */}
          {items.length > 0 && (
            <div className="mb-12 lg:hidden">
              <Card className="bg-gradient-to-br from-[#C89F7A]/5 to-white border-[#C89F7A]/20 shadow-md">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-2xl font-bold text-[#111111]">
                      Your Space Summary
                    </h2>
                    {isAuthenticated && (
                      <Button
                        onClick={handleSeeMoreItems}
                        disabled={loadingMoreItems}
                        variant="ghost"
                        size="sm"
                        className="text-[#C89F7A] hover:text-[#C89F7A] hover:bg-[#C89F7A]/10 -mt-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {loadingMoreItems ? 'Searching...' : 'See More'}
                      </Button>
                    )}
                  </div>
                  <p className="text-[#555555] mb-4">
                    We identified the main elements featured in your inspiration:
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-center text-[#333333]">
                        <span className="text-[#C89F7A] mr-2">•</span>
                        <span className="capitalize">{item.item_name}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Room Materials Card (Mobile) */}
              {showRoomMaterials && roomMaterials && (roomMaterials.walls || roomMaterials.floors) && (
                <Card className="bg-gradient-to-br from-[#C89F7A]/5 to-white border-[#C89F7A]/20 shadow-md mt-4">
                  <CardContent className="p-6 md:p-8">
                    <h2 className="text-2xl font-bold text-[#111111] mb-4">
                      Room Materials
                    </h2>
                    <div className="space-y-3">
                      {roomMaterials.walls && (
                        <div className="flex items-start">
                          <span className="text-[#C89F7A] mr-2 mt-1">•</span>
                          <div>
                            <span className="font-semibold text-[#333333]">Walls: </span>
                            <span className="text-[#555555]">{roomMaterials.walls}</span>
                          </div>
                        </div>
                      )}
                      {roomMaterials.floors && (
                        <div className="flex items-start">
                          <span className="text-[#C89F7A] mr-2 mt-1">•</span>
                          <div>
                            <span className="font-semibold text-[#333333]">Floors: </span>
                            <span className="text-[#555555]">{roomMaterials.floors}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* SECTION 3: Item Chips with Subtitle - Now Clickable */}
          {items.length > 0 && (
            <div className="mb-8">
              <p className="text-center text-sm text-[#666666] mb-4">
                Tap an item to view details and find it online.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => scrollToItem(item.id)}
                    className="bg-white rounded-full px-4 md:px-6 py-3 shadow-md border border-gray-200 flex items-center gap-3 hover:shadow-lg hover:border-[#C89F7A] transition-all cursor-pointer"
                  >
                    <span className="font-semibold text-sm md:text-base text-[#111111]">
                      {item.item_name}
                    </span>
                    <Badge className="bg-[#C89F7A] text-white text-xs">
                      {item.category}
                    </Badge>
                    {item.confidence && (
                      <span className="text-xs md:text-sm text-[#555555]">
                        {Math.round(item.confidence * 100)}% match
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budget Overview */}
          {totalCost && !loadingProducts && isAuthenticated && (
            <div className="flex justify-center mb-12">
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

          {/* SECTION 4: Item Detail Sections (Redesigned with Desktop-Only Compact Layout) */}
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
            <div className="space-y-8 lg:space-y-8">
              {items.map((item) => (
                <div key={item.id} className="lg:max-w-[720px] lg:mx-auto">
                  <div className="space-y-6 lg:bg-[#fafafa] lg:rounded-xl lg:p-6">
                    <div className="text-center">
                      <h2 className="text-2xl md:text-3xl font-bold text-[#111111] mb-2">
                        {item.item_name}
                      </h2>
                      {item.description && (
                        <p className="text-sm md:text-base text-[#555555] mb-2">{item.description}</p>
                      )}
                    </div>

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
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-8 lg:space-y-8">
                {items.map((item, index) => {
                  const itemResult = products[item.id];
                  const itemProducts = itemResult?.products || [];
                  const customMessage = itemResult?.message;

                  return (
                    <div 
                      key={item.id}
                      ref={(el) => { itemRefs.current[item.id] = el; }}
                      className="scroll-mt-24 lg:max-w-[720px] lg:mx-auto"
                    >
                      <div className="space-y-6 lg:bg-[#fafafa] lg:rounded-xl lg:p-6">
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

                        {customMessage || itemProducts.length === 0 ? (
                          <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-200 shadow-sm">
                            <CardContent className="p-6 md:p-8 space-y-4">
                              {/* SEARCH ON Section */}
                              <div className="space-y-3">
                                <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wide">
                                  SEARCH ON
                                </h3>
                                
                                <div className="grid grid-cols-3 gap-2">
                                  <Button
                                    onClick={() => handleRetailerClick(getWayfairSearchUrl, item)}
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full bg-white border border-[#7B2CBF] text-[#111111] hover:bg-[#7B2CBF]/10 font-medium"
                                  >
                                    Wayfair
                                    <ExternalLink className="ml-1.5 h-3 w-3" />
                                  </Button>

                                  <Button
                                    onClick={() => handleRetailerClick(getAmazonSearchUrl, item)}
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full bg-white border border-[#FF9900] text-[#111111] hover:bg-[#FF9900]/10 font-medium"
                                  >
                                    Amazon
                                    <ExternalLink className="ml-1.5 h-3 w-3" />
                                  </Button>

                                  <Button
                                    onClick={() => handleRetailerClick(getWalmartSearchUrl, item)}
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full bg-white border border-[#0071CE] text-[#111111] hover:bg-[#0071CE]/10 font-medium"
                                  >
                                    Walmart
                                    <ExternalLink className="ml-1.5 h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* More stores Section */}
                              <div className="space-y-2">
                                <h3 className="text-sm font-bold text-[#111111]">
                                  More stores
                                </h3>
                                <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                                  <Button
                                    onClick={() => handleRetailerClick(getTemuSearchUrl, item)}
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full bg-white border border-[#FF7A00] text-[#555555] hover:bg-[#FF7A00]/10"
                                  >
                                    Temu
                                    <ExternalLink className="ml-1.5 h-3 w-3" />
                                  </Button>

                                  <Button
                                    onClick={() => handleRetailerClick(getSheinSearchUrl, item)}
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full bg-white border border-[#000000] text-[#555555] hover:bg-[#000000]/10"
                                  >
                                    Shein
                                    <ExternalLink className="ml-1.5 h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Google Search Section */}
                              <Button
                                onClick={() => window.open(getGoogleSearchUrl(buildRetailerQuery(item)), '_blank')}
                                variant="ghost"
                                size="sm"
                                className="w-full text-[#555555] hover:text-[#111111]"
                              >
                                <Search className="mr-2 h-4 w-4" />
                                Search the web (Google)
                              </Button>

                              {/* Divider */}
                              <div className="border-t border-gray-300 my-4"></div>

                              {/* More search options Section */}
                              <div className="space-y-3">
                                <h3 className="text-sm font-bold text-[#111111]">
                                  More search options
                                </h3>
                                <Button
                                  onClick={() => setVisualSearchModal({ isOpen: true, item })}
                                  variant="outline"
                                  size="sm"
                                  className="w-full rounded-full bg-white border border-[#C89F7A] text-[#111111] hover:bg-[#C89F7A]/10 font-medium"
                                >
                                  <Camera className="mr-2 h-4 w-4" />
                                  Find exact match (photo)
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <>
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
                            
                            <div className="text-center pt-4 space-y-3">
                              <p className="text-sm text-[#555555] mb-2">
                                Need more options? Find similar items below
                              </p>
                              
                              <p className="text-xs font-medium text-[#555555] uppercase tracking-wide">
                                Search on:
                              </p>
                              
                              {/* PRIMARY: Retailer Buttons */}
                              <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
                                <Button
                                  onClick={() => handleRetailerClick(getWayfairSearchUrl, item)}
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full bg-white border border-[#7B2CBF] text-[#111111] hover:bg-[#7B2CBF]/10 font-medium"
                                >
                                  Wayfair
                                  <ExternalLink className="ml-1.5 h-3 w-3" />
                                </Button>

                                <Button
                                  onClick={() => handleRetailerClick(getAmazonSearchUrl, item)}
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full bg-white border border-[#FF9900] text-[#111111] hover:bg-[#FF9900]/10 font-medium"
                                >
                                  Amazon
                                  <ExternalLink className="ml-1.5 h-3 w-3" />
                                </Button>

                                <Button
                                  onClick={() => handleRetailerClick(getWalmartSearchUrl, item)}
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full bg-white border border-[#0071CE] text-[#111111] hover:bg-[#0071CE]/10 font-medium"
                                >
                                  Walmart
                                  <ExternalLink className="ml-1.5 h-3 w-3" />
                                </Button>
                              </div>

                              {/* SECONDARY: Temu & Shein Buttons */}
                              <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                                <Button
                                  onClick={() => handleRetailerClick(getTemuSearchUrl, item)}
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full bg-white border border-[#FF7A00] text-[#555555] hover:bg-[#FF7A00]/10"
                                >
                                  Temu
                                  <ExternalLink className="ml-1.5 h-3 w-3" />
                                </Button>

                                <Button
                                  onClick={() => handleRetailerClick(getSheinSearchUrl, item)}
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full bg-white border border-[#000000] text-[#555555] hover:bg-[#000000]/10"
                                >
                                  Shein
                                  <ExternalLink className="ml-1.5 h-3 w-3" />
                                </Button>
                              </div>

                              {/* SECONDARY: Google Search Button */}
                              <Button
                                onClick={() => window.open(getGoogleSearchUrl(buildRetailerQuery(item)), '_blank')}
                                variant="ghost"
                                size="sm"
                                className="w-full text-[#555555] hover:text-[#111111]"
                              >
                                <Search className="mr-2 h-4 w-4" />
                                Search the web (Google)
                              </Button>

                              {/* NEW: More search options section */}
                              <div className="pt-4 border-t border-gray-200">
                                <p className="text-xs font-medium text-[#777777] uppercase tracking-wide text-center mb-3">
                                  More search options
                                </p>
                                <Button
                                  onClick={() => setVisualSearchModal({ isOpen: true, item })}
                                  variant="outline"
                                  size="sm"
                                  className="w-full rounded-full bg-white border border-[#C89F7A] text-[#111111] hover:bg-[#C89F7A]/10 font-medium"
                                >
                                  <Camera className="mr-2 h-4 w-4" />
                                  Find exact match (photo)
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* SECTION 5: Divider Between Each Item */}
                      {index < items.length - 1 && (
                        <div className="my-8 lg:my-8">
                          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Rest of the component remains the same... */}
              {/* SECTION 6: Shopping List CTA Reminder - ALWAYS SHOW */}
              {isAuthenticated && items.length > 0 && (
                <div className="mt-16 mb-12">
                  <Card className="bg-gradient-to-br from-[#C89F7A]/10 to-white border-[#C89F7A]/30 shadow-lg">
                    <CardContent className="p-8 md:p-12 text-center">
                      <h3 className="text-2xl md:text-3xl font-bold text-[#111111] mb-3">
                        Want to track your progress?
                      </h3>
                      <p className="text-base md:text-lg text-[#555555] mb-6 max-w-2xl mx-auto">
                        Save all items into one organized shopping list you can update anytime.
                      </p>
                      {existingChecklist ? (
                        <Button
                          onClick={() => navigate(`/checklists/${existingChecklist.id}`)}
                          className="bg-[#2F9E44] hover:bg-[#2F9E44]/90 text-white font-bold rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
                          size="lg"
                        >
                          <ListChecks className="h-5 w-5 mr-2" />
                          View Shopping List
                        </Button>
                      ) : (
                        <Button
                          onClick={handleSaveAsChecklist}
                          disabled={savingChecklist}
                          className="bg-black hover:bg-black/90 text-white font-bold rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
                          size="lg"
                        >
                          <ListChecks className="h-5 w-5 mr-2" />
                          {savingChecklist ? 'Saving...' : 'Save as Shopping List'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

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

              {additionalProducts.length > 0 && !loadingAdditionalProducts && (
                <div className="mt-20 space-y-6 border-t-2 border-gray-200 pt-12">
                  <div className="text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-[#111111] mb-2">
                      More pieces you can shop today
                    </h2>
                    <p className="text-sm md:text-base text-[#555555]">
                      Discover additional products to complete your space
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
                    {additionalProducts.map((product) => (
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

              {loadingAdditionalProducts && (
                <div className="mt-20 space-y-6 border-t-2 border-gray-200 pt-12">
                  <div className="text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-[#111111] mb-2">
                      More pieces you can shop today
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
        </div>
      </main>

      {showAuthModal && !isAuthenticated && (
        <Auth onSuccess={handleAuthSuccess} redirectPath={`/item-detection/${boardId}`} />
      )}

      {board && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          boardId={board.id}
          checklistId={existingChecklist?.id}
          boardName={board.name}
        />
      )}

      {visualSearchModal.item && (
        <VisualSearchModal
          isOpen={visualSearchModal.isOpen}
          onClose={() => setVisualSearchModal({ isOpen: false, item: null })}
          itemName={visualSearchModal.item.item_name}
          imageUrl={board?.source_image_url || ''}
          croppedImageUrl={visualSearchModal.item.position?.cropped_image_url as string | undefined}
        />
      )}

      <Footer />
    </div>
  );
}