import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AuthModal from '@/components/AuthModal';
import { getExploreSceneBySlug, createChecklist, getChecklistByExploreSceneId } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { ExploreScene, ExploreSceneItemWithProduct, VendorProduct, Storefront, Checklist } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { ExternalLink, ShoppingBag, Wrench, Instagram, ListChecks, Upload } from 'lucide-react';
import { toast } from 'sonner';

const SCROLL_THRESHOLD_PX = 150;

function formatNgn(value: number): string {
  return `₦${Number(value).toLocaleString('en-NG')}`;
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

  // Auth gate (scroll-triggered): show modal when unauthenticated user scrolls past threshold
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const scrollGateTriggered = useRef(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [existingChecklist, setExistingChecklist] = useState<Checklist | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (data === undefined || data === null || !authChecked || user !== null || scrollGateTriggered.current) return;
    const handleScroll = () => {
      if (window.scrollY > SCROLL_THRESHOLD_PX && !scrollGateTriggered.current) {
        scrollGateTriggered.current = true;
        setShowAuthGate(true);
        document.body.style.overflow = 'hidden';
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [data, authChecked, user]);

  // Restore scroll when gate is closed (auth success or unmount)
  useEffect(() => {
    if (!showAuthGate) document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAuthGate]);

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

  // Track explore scene view when user is authenticated and scene is loaded
  useEffect(() => {
    if (user && data && 'scene' in data) {
      trackExploreSceneView(data.scene.id, data.scene.slug, data.scene.title, data.scene.hero_image_url);
    }
  }, [user, data]);

  // Fetch existing checklist for this scene when user and scene are loaded (for "View Shopping List" attached state)
  useEffect(() => {
    if (!user || !data || !('scene' in data)) return;
    getChecklistByExploreSceneId(data.scene.id).then(setExistingChecklist);
  }, [user, data]);

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

    // Build names from all item types in scene order: catalog_product, custom_build, instagram_link
    const itemNames = items
      .map((item) => {
        if (item.item_type === 'catalog_product') return item.vendor_product?.name ?? null;
        return item.name ?? null;
      })
      .filter((name): name is string => !!name);

    if (itemNames.length === 0) {
      toast.error('No items available to save');
      return;
    }

    setSavingChecklist(true);
    try {
      const checklist = await createChecklist(
        `${scene.title} - Shopping List`,
        undefined, // No board_id for explore scenes
        itemNames,
        { sourceImageUrl: scene.hero_image_url ?? undefined, exploreSceneId: scene.id }
      );

      setExistingChecklist(checklist);
      toast.success('Shopping list saved!');
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
        <Header />
        <main className="flex-1 flex items-center justify-center py-24">
          <p className="text-[#555555]">Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f9f9f9]">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center py-24 px-4">
          <p className="text-[#555555] mb-4">This room is not available.</p>
          <Button variant="outline" onClick={() => navigate('/upload?mode=explore')}>
            Browse all rooms
          </Button>
        </main>
        <Footer />
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
  
  console.log('[ExploreScenePage] Filtered items:', {
    catalogItems: catalogItems.length,
    customBuildItems: customBuildItems.length,
    decorItems: decorItems.length,
  });

  const hasSavableItems = items.some((i) =>
    i.item_type === 'catalog_product' ? !!i.vendor_product?.name : !!i.name
  );
  const catalogBudget = Number(scene.catalog_budget_ngn) || 0;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-stone-50">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-8 md:py-12">
        {/* Hero */}
        <section className="mb-10">
          <div className="aspect-[4/3] md:aspect-[16/9] rounded-2xl overflow-hidden bg-gray-200 mb-6">
            <img
              src={scene.hero_image_url || 'https://placehold.co/1200x675/f5f5f5/999?text=Room'}
              alt={scene.title}
              className="w-full h-full object-cover"
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
            Everything in this room can be recreated with verified Nigerian vendors
          </p>
        </div>

        {/* Items available on Homable — line list + total (no custom/decor breakdown) */}
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
            </>
          ) : (
            <p className="text-[#666666] text-sm">No catalog items in this room yet.</p>
          )}
        </section>

        {/* Section A: Available on Homable — storefront-style cards, whole card links to product */}
        {catalogItems.length > 0 && (
          <section className="mb-10">
            <h3 className="text-lg font-semibold text-[#111111] mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Available on Homable
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {catalogItems.map((item) => {
                const product = item.vendor_product;
                if (!product) return null;
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/shops/products/${product.slug}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/shops/products/${product.slug}`);
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
                          Custom order
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

        {/* Section C: Styling & Decor */}
        {decorItems.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-[#111111] mb-4 flex items-center gap-2">
              <Instagram className="w-5 h-5" />
              Styling & Decor
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

      <Footer />

      {/* Scroll-triggered auth gate: modal with blur overlay when unauthenticated user scrolls down */}
      {showAuthGate && (
        <AuthModal
          title="Sign in to continue"
          subtitle="See the full breakdown of this room including prices, vendors, and shopping options"
          onSuccess={() => setShowAuthGate(false)}
          onClose={() => navigate('/')}
        />
      )}
    </div>
  );
}
