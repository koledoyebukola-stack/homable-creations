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
import { ExternalLink, Star, Upload, ListChecks } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
              <div className="max-w-md mx-auto bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-200 p-8">
                <p className="text-lg font-semibold text-[#111111] mb-3">
                  We couldn't find a shoppable match for this look yet
                </p>
                <p className="text-sm text-[#555555] mb-6">
                  We're still stocking our catalogue. Try a different photo or come back soon!
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => navigate('/upload')}
                    className="bg-[#C89F7A] hover:bg-[#B5896C] text-white rounded-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Analyze Again
                  </Button>
                  <Button
                    onClick={() => navigate(`/item-detection/${boardId}`)}
                    variant="outline"
                    className="border-[#C89F7A] text-[#C89F7A] hover:bg-[#C89F7A] hover:text-white rounded-full"
                  >
                    Back to Results
                  </Button>
                </div>
              </div>
            </div>
          ) : (
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