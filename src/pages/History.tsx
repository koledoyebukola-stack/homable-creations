import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCombinedHistory,
  getWhatsAppRedirectProductEvents,
  getProductsByIds,
  getExploreSceneBySlug,
} from '@/lib/api';
import type { WhatsAppRedirectProductEvent } from '@/lib/api';
import { HistoryItem } from '@/lib/types';
import type { Storefront, VendorProduct } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Image as ImageIcon, FileText, Plus, Sparkles, MessageCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

const PRODUCT_CONTACT_INITIAL = 5;
const ROOMS_VIEWED_LIMIT = 20;

function whatsappUrl(number: string): string {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

function formatVendorPrice(p: VendorProduct): string {
  if (p.price_min != null && p.price_max != null && p.price_min !== p.price_max) {
    return `₦${p.price_min.toLocaleString('en-NG')} – ₦${p.price_max.toLocaleString('en-NG')}`;
  }
  if (p.price_min != null) return `From ₦${p.price_min.toLocaleString('en-NG')}`;
  if (p.price_max != null) return `From ₦${p.price_max.toLocaleString('en-NG')}`;
  return 'Price on request';
}

function formatContactedAt(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Product contact card data (event + resolved product/storefront/scene title). */
interface ProductContactCard {
  event: WhatsAppRedirectProductEvent;
  product: VendorProduct;
  storefront: Storefront;
  sceneTitle: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  'sofa': 'Sofa / Sectional',
  'dining-table': 'Dining Table',
  'rug': 'Rug',
  'bed': 'Bed Frame',
  'desk': 'Desk'
};

// Thumbnail images for each category
const CATEGORY_THUMBNAILS: Record<string, string> = {
  'sofa': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop',
  'dining-table': 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&h=300&fit=crop',
  'rug': 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=400&h=300&fit=crop',
  'bed': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=300&fit=crop',
  'desk': 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=300&fit=crop'
};

export default function History() {
  const navigate = useNavigate();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [productContacts, setProductContacts] = useState<ProductContactCard[]>([]);
  const [productContactsExpanded, setProductContactsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const logPrefix = '[History loadHistory]';
    try {
      setLoading(true);
      setError(null);
      console.log(logPrefix, '1. Fetching getCombinedHistory() and getWhatsAppRedirectProductEvents()...');
      const [data, events] = await Promise.all([
        getCombinedHistory(),
        getWhatsAppRedirectProductEvents(), // no limit: load all for "View all" expand
      ]);
      console.log(logPrefix, '2. getCombinedHistory() count:', data.length);
      console.log(logPrefix, '3. getWhatsAppRedirectProductEvents() raw count:', events.length);
      console.log(logPrefix, '4. Events sample (first 2):', JSON.stringify(events.slice(0, 2), null, 2));
      setHistoryItems(data);

      // Build product contact cards: only events with product_id in metadata
      const eventsWithProduct = events.filter((e) => e.metadata && (e.metadata as Record<string, unknown>).product_id != null);
      console.log(logPrefix, '5. eventsWithProduct (metadata has product_id) count:', eventsWithProduct.length);
      if (eventsWithProduct.length === 0) {
        console.log(logPrefix, '6. No product events -> productContacts set to []');
        setProductContacts([]);
        return;
      }
      const productIds = eventsWithProduct.map((e) => e.metadata!.product_id!);
      const resolved = await getProductsByIds(productIds);
      const slugs = [...new Set(eventsWithProduct.map((e) => e.metadata?.from_scene_slug).filter(Boolean) as string[])];
      const sceneTitleBySlug: Record<string, string> = {};
      await Promise.all(
        slugs.map(async (slug) => {
          const result = await getExploreSceneBySlug(slug);
          if (result?.scene?.title) sceneTitleBySlug[slug] = result.scene.title;
        })
      );
      const cards: ProductContactCard[] = [];
      eventsWithProduct.forEach((event, i) => {
        const detail = resolved[i];
        if (!detail) return;
        cards.push({
          event,
          product: detail.product,
          storefront: detail.storefront,
          sceneTitle: event.metadata?.from_scene_slug ? sceneTitleBySlug[event.metadata.from_scene_slug] ?? null : null,
        });
      });
      console.log(logPrefix, '7. Built product contact cards count:', cards.length);
      setProductContacts(cards);
    } catch (err: unknown) {
      console.error('[History loadHistory] Failed to load history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleItemClick = (item: HistoryItem) => {
    if (item.type === 'inspiration') {
      navigate(`/product-matches/${item.board_id}`);
    } else if (item.type === 'explore' && item.scene_slug) {
      navigate(`/explore/${item.scene_slug}`);
    } else {
      // Navigate to specs results with data
      const queryParams = new URLSearchParams();
      queryParams.set('category', item.category || '');
      queryParams.set('data', JSON.stringify(item.specifications || {}));
      navigate(`/specs-results?${queryParams.toString()}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadHistory}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-[#111111]">My History</h1>
            {(historyItems.length > 0 || productContacts.length > 0) && (
              <Button
                onClick={() => navigate('/upload')}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Project</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>
          <p className="text-gray-600">
            Your saved inspirations and specifications
          </p>
        </div>

        {productContacts.length === 0 && historyItems.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-6">
                <ImageIcon className="h-20 w-20 text-[#C89F7A]" strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-semibold text-[#111111] mb-3">
                No history yet
              </h3>
              <p className="text-gray-600 text-center mb-8 max-w-lg leading-relaxed">
                Start by uploading an inspiration image or creating a specs-based search. Your projects will appear here.
              </p>
              <Button
                onClick={() => navigate('/upload')}
                className="bg-black text-white hover:bg-black/90 rounded-full px-8"
                size="lg"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {/* Section 1: Products I Contacted on Whatsapp */}
            {productContacts.length > 0 && (
              <section className="mt-2">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold text-[#111111]">Products I Contacted on Whatsapp</h2>
                  <Badge variant="secondary" className="rounded-full bg-gray-200 text-gray-700 font-medium">
                    {productContacts.length}
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {(productContactsExpanded ? productContacts : productContacts.slice(0, PRODUCT_CONTACT_INITIAL)).map((card) => (
                    <Card key={card.event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="flex gap-4 p-4">
                        <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          {card.product.image_url ? (
                            <img src={card.product.image_url} alt={card.product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <ImageIcon className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#111111] line-clamp-2">{card.product.name}</h3>
                          <p className="text-sm text-gray-500 mt-0.5">{card.storefront.name}</p>
                          <p className="text-sm text-gray-600 mt-1">{formatVendorPrice(card.product)}</p>
                          <p className="text-xs text-gray-500 mt-2">Contacted {formatContactedAt(card.event.created_at)}</p>
                          {card.sceneTitle && (
                            <p className="text-xs text-gray-500 mt-0.5">From: {card.sceneTitle}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Button
                              size="sm"
                              className="bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                const origin = window.location.origin;
                                const productUrl = `${origin}/shops/products/${card.product.slug}`;
                                const message = `Hi, I'm interested in the ${card.product.name}.\n\n${productUrl}`;
                                window.open(`${whatsappUrl(card.storefront.whatsapp_number)}?text=${encodeURIComponent(message)}`, '_blank');
                              }}
                            >
                              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                              Contact Again
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/shops/products/${card.product.slug}`);
                              }}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                              View Product
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                {productContacts.length > PRODUCT_CONTACT_INITIAL && (
                  <Button
                    variant="ghost"
                    className="mt-3 text-gray-600 hover:text-[#111111]"
                    onClick={() => setProductContactsExpanded(!productContactsExpanded)}
                  >
                    {productContactsExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1 inline" />
                        Show less ←
                      </>
                    ) : (
                      <>
                        View all {productContacts.length} products →
                        <ChevronDown className="h-4 w-4 ml-1 inline" />
                      </>
                    )}
                  </Button>
                )}
              </section>
            )}

            {/* Section 2: Rooms I Viewed */}
            {(() => {
              const roomItems = historyItems.filter((i) => i.type === 'explore');
              if (roomItems.length === 0) return null;
              const displayRooms = roomItems.slice(0, ROOMS_VIEWED_LIMIT);
              return (
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-bold text-[#111111]">Rooms I Viewed</h2>
                    <Badge variant="secondary" className="rounded-full bg-gray-200 text-gray-700 font-medium">
                      {roomItems.length}
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {displayRooms.map((item) => (
                      <Card
                        key={item.id}
                        className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                        onClick={() => handleItemClick(item)}
                      >
                        {item.image_url ? (
                          <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="aspect-[4/3] bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                            <Sparkles className="h-16 w-16 text-emerald-400" />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <Badge variant="outline" className="mb-2 bg-emerald-50 text-emerald-700 border-emerald-200">
                            Explore
                          </Badge>
                          <h3 className="text-lg font-semibold text-[#111111] line-clamp-2 mb-2">{item.title}</h3>
                          <p className="text-sm text-gray-500">{formatDate(item.created_at)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {roomItems.length > ROOMS_VIEWED_LIMIT && (
                    <p className="text-sm text-gray-500 mt-2">Showing latest {ROOMS_VIEWED_LIMIT} of {roomItems.length} rooms</p>
                  )}
                </section>
              );
            })()}

            {/* Section 3: Analysis Sessions */}
            {(() => {
              const analysisItems = historyItems.filter((i) => i.type === 'specs' || i.type === 'inspiration');
              if (analysisItems.length === 0) return null;
              return (
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-bold text-[#111111]">Analysis Sessions</h2>
                    <Badge variant="secondary" className="rounded-full bg-gray-200 text-gray-700 font-medium">
                      {analysisItems.length}
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {analysisItems.map((item) => (
                      <Card
                        key={item.id}
                        className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                        onClick={() => handleItemClick(item)}
                      >
                        {item.type === 'inspiration' && item.image_url ? (
                          <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                          </div>
                        ) : item.type === 'specs' && item.category && CATEGORY_THUMBNAILS[item.category] ? (
                          <div className="aspect-[4/3] overflow-hidden bg-gray-100 relative">
                            <img
                              src={CATEGORY_THUMBNAILS[item.category]}
                              alt={CATEGORY_LABELS[item.category] || item.category}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-4">
                              <FileText className="h-8 w-8 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-[4/3] bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                            {item.type === 'inspiration' ? (
                              <Sparkles className="h-16 w-16 text-purple-400" />
                            ) : (
                              <FileText className="h-16 w-16 text-purple-400" />
                            )}
                          </div>
                        )}
                        <CardContent className="p-4">
                          <Badge
                            variant="outline"
                            className={
                              item.type === 'inspiration'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }
                          >
                            {item.type === 'inspiration' ? 'Inspiration' : 'Specs'}
                          </Badge>
                          <h3 className="text-lg font-semibold text-[#111111] line-clamp-2 mt-2 mb-2">
                            {item.type === 'specs' && item.category ? CATEGORY_LABELS[item.category] || item.category : item.title}
                          </h3>
                          {item.type === 'specs' && item.search_queries && item.search_queries.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-500 mb-1">Search strategies:</p>
                              <div className="space-y-1">
                                {item.search_queries.slice(0, 2).map((query, idx) => (
                                  <p key={idx} className="text-xs font-mono text-gray-600 truncate bg-gray-50 px-2 py-1 rounded">
                                    {query}
                                  </p>
                                ))}
                                {item.search_queries.length > 2 && (
                                  <p className="text-xs text-gray-500">+{item.search_queries.length - 2} more</p>
                                )}
                              </div>
                            </div>
                          )}
                          <p className="text-sm text-gray-500">{formatDate(item.created_at)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })()}
          </div>
        )}
      </main>

    </div>
  );
}