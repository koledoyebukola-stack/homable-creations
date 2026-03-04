import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AuthModal from '@/components/AuthModal';
import { getExploreSceneBySlug, createChecklist, getChecklistByExploreSceneId, getRandomArtworkProducts } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { trackNgEvent, NG_EVENTS } from '@/lib/analytics-ng';
import type { ExploreScene, ExploreSceneItemWithProduct, VendorProduct, Storefront, Checklist } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { ExternalLink, ShoppingBag, Wrench, Instagram, ListChecks, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

function formatNgn(value: number): string {
  return `₦${Number(value).toLocaleString('en-NG')}`;
}

function formatCad(value: number): string {
  return `C$${Number(value).toLocaleString('en-CA')}`;
}

function formatVendorPrice(p: VendorProduct): string {
  if (p.price_min != null && p.price_max != null && p.price_min !== p.price_max) {
    return `${formatNgn(p.price_min)} – ${formatNgn(p.price_max)}`;
  }
  if (p.price_min != null) return `From ${formatNgn(p.price_min)}`;
  if (p.price_max != null) return `From ${formatNgn(p.price_max)}`;
  return 'Price on request';
}

export default function ExploreScenePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<{ scene: ExploreScene; items: ExploreSceneItemWithProduct[] } | null | undefined>(undefined);

  // Auth gate (CA + NG): show modal when unauthenticated user clicks a product card, "View on [retailer]" (CA), or Instagram link (NG)
  const [user, setUser] = useState<User | null>(null);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const lastIncrementedSceneIdRef = useRef<string | null>(null);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [existingChecklist, setExistingChecklist] = useState<Checklist | null>(null);
  const [randomArtworkProducts, setRandomArtworkProducts] = useState<VendorProduct[]>([]);
  const [isHeroImageOpen, setIsHeroImageOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'down' | 'up'>('down');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Restore scroll when auth gate is closed (auth success or unmount)
  useEffect(() => {
    if (!showAuthGate) document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAuthGate]);

  // Close hero image overlay on ESC key
  useEffect(() => {
    if (!isHeroImageOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsHeroImageOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHeroImageOpen]);

  // Floating scroll navigation button on mobile (up/down based on scroll position)
  useEffect(() => {
    const handleScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const maxScroll = doc.scrollHeight - window.innerHeight;

      if (maxScroll <= 0) {
        setShowScrollButton(false);
        return;
      }

      setShowScrollButton(true);

      const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0;
      setScrollDirection(ratio < 0.5 ? 'down' : 'up');
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!slug) return;
    getExploreSceneBySlug(slug).then(result => {
      console.log('[ExploreScenePage] getExploreSceneBySlug result:', result);
      if (result) {
        console.log('[ExploreScenePage] Scene:', result.scene.title);
        console.log('[ExploreScenePage] Items count:', result.items.length);
        console.log('[ExploreScenePage] Items:', result.items);
        setData(result);
      } else {
        console.warn('[ExploreScenePage] No scene found for slug:', slug);
        setData(null);
      }
    });
  }, [slug]);

  // Increment view_count for ALL visitors (signed-in + anonymous) — once per detail page load per scene
  useEffect(() => {
    if (!data || !('scene' in data)) return;
    const sceneId = data.scene.id;
    if (lastIncrementedSceneIdRef.current === sceneId) return;
    lastIncrementedSceneIdRef.current = sceneId;
    supabase.rpc('increment_explore_scene_view_count', { p_scene_id: sceneId }).then(({ error }) => {
      if (error) console.error('[ExploreScenePage] Failed to increment view count:', error);
    });
  }, [data]);

  // Track explore scene view for signed-in users (History / analytics) — per-user record
  useEffect(() => {
    if (user && data && 'scene' in data) {
      trackExploreSceneView(data.scene.id, data.scene.slug, data.scene.title, data.scene.hero_image_url);
    }
  }, [user, data]);

  // Nigerian journey: room selection (user clicked a room card and is viewing this room)
  useEffect(() => {
    if (data && 'scene' in data) {
      const { scene: s } = data;
      trackNgEvent(NG_EVENTS.ROOM_SELECTION, {
        scene_id: s.id,
        scene_title: s.title,
        scene_slug: s.slug,
      });
    }
  }, [data]);

  // Fetch existing checklist for this scene when user and scene are loaded (for "View Shopping List" attached state)
  useEffect(() => {
    if (!user || !data || !('scene' in data)) return;
    getChecklistByExploreSceneId(data.scene.id).then(setExistingChecklist);
  }, [user, data]);

  // When scene has no artwork items, fetch 5 random artwork products for "Complete This Look with Artwork" section
  useEffect(() => {
    if (!data || !('scene' in data)) return;
    const catalogItems = data.items.filter((i) => i.item_type === 'catalog_product');
    const hasArtwork = catalogItems.some((i) => i.vendor_product?.category === 'artwork');
    if (!hasArtwork) {
      getRandomArtworkProducts('NG', 5).then(setRandomArtworkProducts);
    } else {
      setRandomArtworkProducts([]);
    }
  }, [data]);

  // Track explore scene view in history
  const trackExploreSceneView = async (
    sceneId: string,
    sceneSlug: string,
    sceneTitle: string,
    heroImageUrl: string | null
  ) => {
    if (!user) return;
    try {
      // Check if view already exists
      const { data: existing } = await supabase
        .from('explore_scene_views')
        .select('id')
        .eq('user_id', user.id)
        .eq('scene_id', sceneId)
        .maybeSingle();

      if (!existing) {
        // Create new view record
        await supabase.from('explore_scene_views').insert({
          user_id: user.id,
          scene_id: sceneId,
          scene_slug: sceneSlug,
          scene_title: sceneTitle,
          scene_image_url: heroImageUrl,
        });
      } else {
        // Update last viewed timestamp
        await supabase
          .from('explore_scene_views')
          .update({ viewed_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
    } catch (error) {
      console.error('Failed to track explore scene view:', error);
      // Don't block user if tracking fails
    }
  };

  const handleSaveShoppingList = async () => {
    if (!user) {
      toast.error('Please sign in to save a shopping list');
      return;
    }

    // Build item payloads with names and link fields for Explore lists:
    // - Nigeria: vendor products (internal) and Instagram items
    // - Canada / external scenes: external retailer items (external_product_url + retailer name)
    const checklistItemInputs = items
      .map((item) => {
        const itemName =
          item.item_type === 'catalog_product'
            ? item.vendor_product?.name ?? item.name ?? null
            : item.name ?? null;
        if (!itemName) return null;

        // Canadian / external retailer items — save external URL + retailer name so checklist can open retailer directly
        if (item.external_product_url) {
          const payload: {
            item_name: string;
            vendor_product_slug?: string;
            instagram_handle?: string;
          } = {
            item_name: itemName,
          };
          // Reuse vendor_product_slug field to store the external URL (ChecklistDetail detects URLs vs slugs)
          payload.vendor_product_slug = item.external_product_url;
          // Reuse instagram_handle field to store retailer display name for button label
          if (item.external_retailer_name) {
            payload.instagram_handle = item.external_retailer_name;
          }
          return payload;
        }

        // Nigerian vendor product items — keep existing behavior (link to /shops/products/{slug})
        if (item.item_type === 'catalog_product' && item.vendor_product?.slug) {
          return { item_name: itemName, vendor_product_slug: item.vendor_product.slug };
        }

        // Nigerian Instagram decor items — keep existing behavior (link to instagram.com/{handle})
        if (item.item_type === 'instagram_link' && item.instagram_handle) {
          return { item_name: itemName, instagram_handle: item.instagram_handle.replace(/^@/, '') };
        }
        return { item_name: itemName };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);

    if (checklistItemInputs.length === 0) {
      toast.error('No items available to save');
      return;
    }

    setSavingChecklist(true);
    try {
      const checklist = await createChecklist(
        `${scene.title} - Shopping List`,
        undefined, // No board_id for explore scenes
        checklistItemInputs,
        { sourceImageUrl: scene.hero_image_url ?? undefined, exploreSceneId: scene.id }
      );

      setExistingChecklist(checklist);
      toast.success('Shopping list saved!');
      trackNgEvent(NG_EVENTS.SHOPPING_LIST_CREATED, {
        checklist_id: checklist.id,
        explore_scene_id: scene.id,
        item_count: checklistItemInputs.length,
        total_budget: catalogBudget,
      });
      navigate(`/checklists/${checklist.id}`);
    } catch (error) {
      console.error('Failed to save shopping list:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save shopping list');
    } finally {
      setSavingChecklist(false);
    }
  };

  if (data === undefined) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f9f9f9]">
        <main className="flex-1 flex items-center justify-center py-24">
          <p className="text-[#555555]">Loading…</p>
        </main>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f9f9f9]">
        <main className="flex-1 flex flex-col items-center justify-center py-24 px-4">
          <p className="text-[#555555] mb-4">This room is not available.</p>
          <Button variant="outline" onClick={() => navigate('/upload?mode=explore')}>
            Browse all rooms
          </Button>
        </main>
      </div>
    );
  }

  const { scene, items } = data;
  console.log('[ExploreScenePage] Rendering with items:', items.length);
  console.log('[ExploreScenePage] Items breakdown:', {
    catalog: items.filter(i => i.item_type === 'catalog_product').length,
    custom_build: items.filter(i => i.item_type === 'custom_build').length,
    instagram_link: items.filter(i => i.item_type === 'instagram_link').length,
  });

  const catalogItems = items.filter((i) => i.item_type === 'catalog_product');
  const customBuildItems = items.filter((i) => i.item_type === 'custom_build');
  const decorItems = items.filter((i) => i.item_type === 'instagram_link');

  // Canadian Explore: external retailer items (Wayfair, Ashley, TOV, etc.)
  const externalItems = items.filter(
    (i) => !i.vendor_product && !!i.external_product_url,
  );

  const isCanadaScene = scene.location === 'CA';
  const isNigeriaScene = scene.location === 'NG';

  const canadianPricedItems = externalItems.filter(
    (i) => typeof i.external_price_cad === 'number' && (i.external_price_cad ?? 0) > 0,
  );
  const canadianTotalCad = canadianPricedItems.reduce(
    (sum, i) => sum + (i.external_price_cad ?? 0),
    0,
  );

  /** Split catalog items by vendor_type for "Available on Homable": Furniture (carpenter) first, Decorative Items (decor_store) second. */
  const furnitureItems = catalogItems.filter((i) => i.storefront?.vendor_type !== 'decor_store');
  const decorativeItems = catalogItems.filter((i) => i.storefront?.vendor_type === 'decor_store');

  /** True if this scene has at least one catalog product with category = 'artwork' */
  const hasArtworkInScene = catalogItems.some((i) => i.vendor_product?.category === 'artwork');

  const hasSavableItems = isCanadaScene
    ? externalItems.length > 0
    : items.some((i) =>
        i.item_type === 'catalog_product' ? !!i.vendor_product?.name : !!i.name,
      );
  const catalogBudget = Number(scene.catalog_budget_ngn) || 0;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-stone-50">

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-8 md:py-12">
        {/* Hero: full-bleed on mobile, 16/9 on desktop (click to enlarge) */}
        <section className="mb-10">
          <div
            className="relative -mx-4 md:mx-0 w-[calc(100%+2rem)] md:w-full aspect-[16/10] md:aspect-[16/9] rounded-none md:rounded-2xl overflow-hidden mb-6 cursor-zoom-in"
            onClick={() => {
              if (scene.hero_image_url) {
                setIsHeroImageOpen(true);
              }
            }}
          >
            <img
              src={scene.hero_image_url || 'https://placehold.co/1200x675/f5f5f5/999?text=Room'}
              alt={scene.title}
              className="w-full h-full object-cover object-center"
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#111111] mb-2">{scene.title}</h1>
          {scene.description && (
            <p className="text-lg text-[#555555] mb-6">{scene.description}</p>
          )}

          {/* Action buttons: stacked on mobile, side by side on desktop; show green "View Shopping List" when already saved */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            {existingChecklist ? (
              <Button
                onClick={() => navigate(`/checklists/${existingChecklist.id}`)}
                className="bg-[#2F9E44] hover:bg-[#2F9E44]/90 text-white font-medium rounded-xl px-5 py-2.5 h-auto text-sm flex items-center gap-2 w-full sm:w-auto shadow-md"
              >
                <ListChecks className="w-4 h-4 shrink-0" />
                View Shopping List
              </Button>
            ) : (
              <Button
                onClick={handleSaveShoppingList}
                disabled={savingChecklist || !hasSavableItems}
                className="bg-[#111111] hover:bg-[#333] text-white rounded-xl font-medium px-5 py-2.5 h-auto text-sm flex items-center gap-2 w-full sm:w-auto"
              >
                <ListChecks className="w-4 h-4 shrink-0" />
                {savingChecklist ? 'Saving...' : 'Save as Shopping List'}
              </Button>
            )}
            <Button
              variant="outline"
              className="rounded-xl border-[#e0e0e0] hover:border-black flex items-center gap-2 px-5 py-2.5 h-auto text-sm w-full sm:w-auto"
              onClick={() => navigate('/upload?mode=explore')}
            >
              <Upload className="w-4 h-4 shrink-0" />
              Explore Another Room
            </Button>
          </div>
        </section>

        {/* Shop This Look — intro above items (secondary to room title) */}
        <div className="text-center mt-12 mb-8">
          <h2 className="text-2xl font-bold text-[#111111] mb-2 flex items-center justify-center gap-2">
            <ShoppingBag className="w-6 h-6 text-[#111111]" aria-hidden />
            Shop This Look
          </h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            {isCanadaScene
              ? 'Hand-picked products from trusted Canadian retailers, curated for your space.'
              : 'Everything in this room can be recreated with verified Nigerian vendors'}
          </p>
        </div>

        {/* Budget summary: Nigeria uses NGN vendor products; Canada uses external CAD prices */}
        {!isCanadaScene && (
          <section className="mb-10 p-6 rounded-2xl bg-white border border-[#e5e5e5] shadow-sm">
            <h3 className="text-base font-semibold text-[#111111] mb-1">Items available on Homable</h3>
            <p className="text-sm text-[#666666] mb-4">Prices below; click any item to view and contact the vendor.</p>
            {catalogItems.length > 0 ? (
              <>
                <ul className="space-y-2 text-[#333333]">
                  {catalogItems.map((item) => {
                    const product = item.vendor_product;
                    if (!product) return null;
                    return (
                      <li key={item.id} className="flex justify-between items-baseline gap-3">
                        <span className="text-[#111111] truncate">{product.name}</span>
                        <span className="font-medium text-[#111111] flex-shrink-0">
                          {formatVendorPrice(product)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex justify-between items-baseline pt-3 mt-3 border-t border-[#e5e5e5]">
                  <span className="font-semibold text-[#111111]">Total</span>
                  <span className="font-semibold text-[#111111]">{formatNgn(catalogBudget)}</span>
                </div>
            <p className="mt-2 text-xs text-[#777777]">
              Prices shown at time of curation and may vary.
            </p>
              </>
            ) : (
              <p className="text-[#666666] text-sm">No catalog items in this room yet.</p>
            )}
          </section>
        )}

        {isCanadaScene && canadianPricedItems.length > 0 && (
          <section className="mb-10 p-6 rounded-2xl bg-white border border-[#e5e5e5] shadow-sm">
            <h3 className="text-base font-semibold text-[#111111] mb-1">Items available to shop</h3>
            <p className="text-sm text-[#666666] mb-4">
              Tap a row to jump to the product below. Prices below; click any card to view on the retailer&apos;s site.
            </p>
            <ul className="space-y-1 text-[#333333]">
              {canadianPricedItems.map((item) => {
                const retailer = item.external_retailer_name || 'Retailer';
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`card-${item.id}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="w-full flex items-center justify-between gap-2 py-2.5 px-3 rounded-lg text-left transition-colors active:bg-gray-100 hover:bg-gray-50"
                    >
                      <span className="text-[#111111] truncate min-w-0 flex-1">{item.name}</span>
                      <span className="flex-shrink-0 inline-block text-[10px] font-medium text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                        {retailer}
                      </span>
                      <span className="font-medium text-[#111111] flex-shrink-0">
                        {formatCad(item.external_price_cad ?? 0)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex justify-between items-baseline pt-3 mt-3 border-t border-[#e5e5e5]">
              <span className="font-semibold text-[#111111]">Total</span>
              <span className="font-semibold text-[#111111]">
                {formatCad(canadianTotalCad)}
              </span>
            </div>
            <p className="mt-2 text-xs text-[#777777]">
              Prices shown at time of curation and may vary.
            </p>
          </section>
        )}

        {/* Section A: Available on Homable — grouped by vendor_type: Furniture (carpenter) then Decorative Items (decor_store) */}
        {!isCanadaScene && catalogItems.length > 0 && (
          <section className="mb-10">
            <h3 className="text-lg font-semibold text-[#111111] mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Shop This Look on Homable
            </h3>

            {furnitureItems.length > 0 && (
              <div className="mb-8">
                <h4 className="text-base font-semibold text-[#111111] mb-3">Furniture</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {furnitureItems.map((item) => {
                    const product = item.vendor_product;
                    if (!product) return null;
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (!user) {
                            setShowAuthGate(true);
                            document.body.style.overflow = 'hidden';
                            return;
                          }
                          trackNgEvent(NG_EVENTS.CATALOG_PRODUCT_CLICKED, {
                            product_id: product.id,
                            product_name: product.name,
                            vendor_id: item.storefront?.id ?? undefined,
                            explore_scene_id: scene.id,
                          });
                          navigate(
                            `/shops/products/${product.slug}?fromSceneSlug=${encodeURIComponent(scene.slug)}`,
                          );
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (!user) {
                              setShowAuthGate(true);
                              document.body.style.overflow = 'hidden';
                              return;
                            }
                            trackNgEvent(NG_EVENTS.CATALOG_PRODUCT_CLICKED, {
                              product_id: product.id,
                              product_name: product.name,
                              vendor_id: item.storefront?.id ?? undefined,
                              explore_scene_id: scene.id,
                            });
                            navigate(
                              `/shops/products/${product.slug}?fromSceneSlug=${encodeURIComponent(scene.slug)}`,
                            );
                          }
                        }}
                        className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left cursor-pointer border border-[#e5e5e5] flex flex-col"
                      >
                        <div className="aspect-[3/4] w-full bg-gray-100 relative overflow-hidden rounded-2xl flex-shrink-0">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#999] text-sm">No image</div>
                          )}
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-gray-900 text-white text-[10px] font-medium border-0 shadow-sm px-2 py-1 rounded-full">
                              Sold by {item.storefront?.name ? item.storefront.name.split(' ').slice(0, 2).join(' ') : 'vendor'}
                            </Badge>
                          </div>
                        </div>
                        <div className="px-2.5 pt-2.5 pb-3 md:px-3 md:pt-3">
                          <h3 className="text-[13px] md:text-sm font-semibold text-gray-900 leading-snug">
                            {product.name}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">
                            {formatVendorPrice(product)}
                          </p>
                          <p className="text-sm text-gray-500 mt-1.5">Tap to view details →</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {decorativeItems.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-[#111111] mb-3">Decorative Items</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {decorativeItems.map((item) => {
                    const product = item.vendor_product;
                    if (!product) return null;
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (!user) {
                            setShowAuthGate(true);
                            document.body.style.overflow = 'hidden';
                            return;
                          }
                          trackNgEvent(NG_EVENTS.CATALOG_PRODUCT_CLICKED, {
                            product_id: product.id,
                            product_name: product.name,
                            vendor_id: item.storefront?.id ?? undefined,
                            explore_scene_id: scene.id,
                          });
                          navigate(
                            `/shops/products/${product.slug}?fromSceneSlug=${encodeURIComponent(scene.slug)}`,
                          );
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (!user) {
                              setShowAuthGate(true);
                              document.body.style.overflow = 'hidden';
                              return;
                            }
                            trackNgEvent(NG_EVENTS.CATALOG_PRODUCT_CLICKED, {
                              product_id: product.id,
                              product_name: product.name,
                              vendor_id: item.storefront?.id ?? undefined,
                              explore_scene_id: scene.id,
                            });
                            navigate(
                              `/shops/products/${product.slug}?fromSceneSlug=${encodeURIComponent(scene.slug)}`,
                            );
                          }
                        }}
                        className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left cursor-pointer border border-[#e5e5e5] flex flex-col"
                      >
                        <div className="aspect-[3/4] w-full bg-gray-100 relative overflow-hidden rounded-2xl flex-shrink-0">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#999] text-sm">No image</div>
                          )}
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-gray-900 text-white text-[10px] font-medium border-0 shadow-sm px-2 py-1 rounded-full">
                              Sold by {item.storefront?.name ? item.storefront.name.split(' ').slice(0, 2).join(' ') : 'vendor'}
                            </Badge>
                          </div>
                        </div>
                        <div className="px-2.5 pt-2.5 pb-3 md:px-3 md:pt-3">
                          <h3 className="text-[13px] md:text-sm font-semibold text-gray-900 leading-snug">
                            {product.name}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">
                            {formatVendorPrice(product)}
                          </p>
                          <p className="text-sm text-gray-500 mt-1.5">Tap to view details →</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Section A2: Canadian Explore — external retailer cards (Wayfair, Ashley, TOV, etc.) */}
        {isCanadaScene && externalItems.length > 0 && (
          <section className="mb-10">
            <h3 className="text-lg font-semibold text-[#111111] mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Shop This Look
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
              {externalItems.map((item) => {
                const retailer = item.external_retailer_name || 'Retailer';
                const price =
                  typeof item.external_price_cad === 'number'
                    ? `C$${item.external_price_cad.toLocaleString('en-CA')}`
                    : null;
                const isUnavailable = item.external_available === false;
                const productUrl = item.external_product_url || undefined;

                // Build retailer search URL for "Find similar" when unavailable.
                const searchQuery = item.name || '';
                const encodedQuery = encodeURIComponent(searchQuery);
                let findSimilarUrl: string | undefined;
                const retailerLower = retailer.toLowerCase();
                if (retailerLower.includes('wayfair')) {
                  findSimilarUrl = `https://www.wayfair.ca/keyword.php?keyword=${encodedQuery}`;
                } else if (retailerLower.includes('ashley')) {
                  findSimilarUrl = `https://ashleyhomestore.ca/search?q=${encodedQuery}`;
                } else if (retailerLower.includes('tov')) {
                  findSimilarUrl = `https://tovfurniture.com/search?q=${encodedQuery}`;
                }

                const handleCardClick = () => {
                  if (!user) {
                    setShowAuthGate(true);
                    document.body.style.overflow = 'hidden';
                    return;
                  }
                  if (isUnavailable && findSimilarUrl) {
                    window.open(findSimilarUrl, '_blank', 'noopener,noreferrer');
                  } else if (!isUnavailable && productUrl) {
                    window.open(productUrl, '_blank', 'noopener,noreferrer');
                  }
                };

                return (
                  <div
                    key={item.id}
                    id={`card-${item.id}`}
                    className={`group bg-white rounded-2xl overflow-hidden border flex flex-col ${
                      isUnavailable
                        ? 'border-gray-300 bg-gray-50 opacity-90'
                        : 'border-[#e5e5e5] shadow-sm hover:shadow-lg transition-shadow'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={handleCardClick}
                      className="flex flex-col flex-1 w-full text-left cursor-pointer min-w-0"
                    >
                      {/* Mobile: fixed ~200px image height; desktop: aspect ratio */}
                      <div className="h-[200px] sm:h-auto sm:aspect-[3/4] w-full bg-gray-100 relative overflow-hidden rounded-2xl flex-shrink-0">
                        {item.external_image_url ? (
                          <img
                            src={item.external_image_url}
                            alt={item.name}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#999] text-sm">
                            No image
                          </div>
                        )}
                        <div className="absolute top-2 left-2 space-y-1">
                          <span className="inline-block bg-gray-900 text-white text-[10px] font-medium border-0 shadow-sm px-2 py-1 rounded-full">
                            Sold by {retailer}
                          </span>
                          {isUnavailable && (
                            <span className="inline-block bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              Currently unavailable
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="px-2 pt-2 pb-2.5 sm:px-3 sm:pt-3 flex-1 flex flex-col">
                        <h3 className="text-[12px] sm:text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-1">
                          {item.name}
                        </h3>
                        {price && (
                          <p className="text-[11px] sm:text-xs text-gray-600 mb-2">
                            {price}
                          </p>
                        )}

                        <div className="mt-auto pointer-events-none">
                          {isUnavailable ? (
                            <span className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-[11px] sm:text-xs h-8 sm:h-9 px-3 w-full">
                              {findSimilarUrl
                                ? `Find similar on ${retailer}`
                                : 'Currently unavailable'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center rounded-lg bg-[#111111] text-white text-[11px] sm:text-xs h-8 sm:h-9 px-3 w-full">
                              View on {retailer}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section B: Custom Build Options */}
        {customBuildItems.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-[#111111] mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Custom Build Options
            </h2>
            <ul className="space-y-6">
              {customBuildItems.map((item) => (
                <li
                  key={item.id}
                  className="p-4 rounded-xl bg-white border border-[#e5e5e5]"
                >
                  <h3 className="font-semibold text-[#111111]">{item.name}</h3>
                  <p className="text-[#555555] text-sm mt-1">Price on request</p>
                  {item.description && (
                    <p className="text-[#666666] mt-2">{item.description}</p>
                  )}
                  <p className="text-sm text-[#777777] mt-2">Not currently available on Homable</p>
                  <Button
                    size="sm"
                    className="mt-3 rounded-lg bg-[#111111] hover:bg-[#333] text-white border-0"
                    onClick={() => {
                      // Placeholder: Request Build Spec - ₦5,000
                    }}
                  >
                    Request Build Spec – ₦5,000
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Complete This Look with Artwork — only when scene has no artwork items (Nigeria only) */}
        {!isCanadaScene && !hasArtworkInScene && randomArtworkProducts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-[#111111] mb-2">Complete This Look with Artwork</h2>
            <p className="text-sm text-gray-600 mb-1">Choose from our curated collection</p>
            <p className="text-sm text-gray-500 mb-4">Swipe to see more →</p>
            <div className="overflow-x-auto pb-1 scroll-pills-hide-scrollbar md:overflow-visible">
              <div className="flex gap-4 md:grid md:grid-cols-5 min-w-0 md:min-w-full">
                {randomArtworkProducts.map((product) => (
                  <div
                    key={product.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      navigate(
                        `/shops/products/${product.slug}?fromSceneSlug=${encodeURIComponent(scene.slug)}`,
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(
                          `/shops/products/${product.slug}?fromSceneSlug=${encodeURIComponent(scene.slug)}`,
                        );
                      }
                    }}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left cursor-pointer border border-[#e5e5e5] flex flex-col flex-shrink-0 w-[calc(50%-0.5rem)] min-w-[140px] md:w-full md:min-w-0"
                  >
                    <div className="aspect-[3/4] w-full bg-gray-100 relative overflow-hidden rounded-2xl flex-shrink-0">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#999] text-sm">No image</div>
                      )}
                    </div>
                    <div className="px-2.5 pt-2.5 pb-3 md:px-3 md:pt-3">
                      <h3 className="text-[13px] md:text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">{formatVendorPrice(product)}</p>
                      <p className="text-sm text-gray-500 mt-1.5">View details →</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Section C: Styling & Decor */}
        {decorItems.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-[#111111] mb-4 flex items-center gap-2">
              <Instagram className="w-5 h-5" />
              Find the Rest on Instagram
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              These items are available from trusted Instagram vendors. Contact them directly for pricing and availability.
            </p>
            <ul className="space-y-6">
              {decorItems.map((item) => (
                <li
                  key={item.id}
                  className="p-4 rounded-xl bg-white border border-[#e5e5e5]"
                >
                  <h3 className="font-semibold text-[#111111]">{item.name}</h3>
                  <p className="text-[#555555] text-sm mt-1">Contact vendor for price</p>
                  {item.instagram_handle && (
                    <p className="text-sm text-[#666666] mt-1">
                      Handle: {item.instagram_handle}
                    </p>
                  )}
                  {item.external_link && (
                    <a
                      href={item.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!user) {
                          e.preventDefault();
                          setShowAuthGate(true);
                          document.body.style.overflow = 'hidden';
                          return;
                        }
                        trackNgEvent(NG_EVENTS.VIEW_ON_INSTAGRAM_CLICKED, {
                          instagram_handle: item.instagram_handle ?? undefined,
                          item_name: item.name ?? undefined,
                          explore_scene_id: scene.id,
                        });
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#111111] text-white px-3 py-2 text-sm font-medium hover:bg-[#333] border-0"
                    >
                      <ExternalLink className="w-4 h-4 shrink-0" />
                      View on Instagram
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

      </main>

      {/* Full-screen hero image overlay */}
      {isHeroImageOpen && scene.hero_image_url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 md:p-8 transition-opacity"
          onClick={() => setIsHeroImageOpen(false)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsHeroImageOpen(false)}
              className="absolute top-3 right-3 rounded-full bg-black/60 hover:bg-black text-white p-2 text-xs md:text-sm"
            >
              ×
            </button>
            <img
              src={scene.hero_image_url}
              alt={scene.title}
              className="w-full h-full object-contain object-center rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Floating scroll navigation button (mobile only) */}
      {showScrollButton && (
        <button
          type="button"
          className="fixed bottom-20 right-4 z-40 md:hidden rounded-full bg-black text-white p-3 shadow-lg border border-black/10 flex items-center justify-center"
          onClick={() => {
            if (scrollDirection === 'down') {
              window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: 'smooth',
              });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          aria-label={scrollDirection === 'down' ? 'Scroll to bottom' : 'Scroll to top'}
        >
          {scrollDirection === 'down' ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronUp className="w-5 h-5" />
          )}
        </button>
      )}

      {/* Auth gate: show login when unauthenticated user clicks a product card, "View on [retailer]" (CA), or Instagram link (NG) */}
      {showAuthGate && (
        <AuthModal
          title="Sign in to continue"
          subtitle="Sign in to open product links and shop this look"
          onSuccess={() => {
            setShowAuthGate(false);
          }}
          onClose={() => {
            setShowAuthGate(false);
            document.body.style.overflow = '';
          }}
        />
      )}
    </div>
  );
}
