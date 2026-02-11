import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AuthModal from '@/components/AuthModal';
import { getExploreSceneBySlug } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { ExploreScene, ExploreSceneItemWithProduct, VendorProduct, Storefront } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { ExternalLink, ShoppingBag, Wrench, Instagram } from 'lucide-react';

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
      if (result) setData(result);
      else setData(null);
    });
  }, [slug]);

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
  const catalogItems = items.filter((i) => i.item_type === 'catalog_product');
  const customBuildItems = items.filter((i) => i.item_type === 'custom_build');
  const decorItems = items.filter((i) => i.item_type === 'instagram_link');

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
            <p className="text-lg text-[#555555]">{scene.description}</p>
          )}
        </section>

        {/* Items available on Homable — line list + total (no custom/decor breakdown) */}
        <section className="mb-10 p-6 rounded-2xl bg-white border border-[#e5e5e5] shadow-sm">
          <h2 className="text-xl font-semibold text-[#111111] mb-1">Items available on Homable</h2>
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
            <h2 className="text-xl font-semibold text-[#111111] mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Available on Homable
            </h2>
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
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left cursor-pointer border border-[#e5e5e5]"
                  >
                    <div className="aspect-square w-full bg-gray-100 relative overflow-hidden rounded-2xl">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                    variant="outline"
                    className="mt-3 rounded-lg"
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
            <ul className="space-y-6">
              {decorItems.map((item) => (
                <li
                  key={item.id}
                  className="p-4 rounded-xl bg-white border border-[#e5e5e5]"
                >
                  <h3 className="font-semibold text-[#111111]">{item.name}</h3>
                  <p className="text-[#555555] text-sm mt-1">Contact vendor for price</p>
                  {item.external_link && (
                    <p className="text-sm text-[#666666] mt-1">
                      Handle: @{item.external_link.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/?$/, '')}
                    </p>
                  )}
                  {item.external_link && (
                    <a
                      href={item.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#e0e0e0] px-3 py-2 text-sm font-medium hover:bg-[#f5f5f5]"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on Instagram
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="pt-6 text-center">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => navigate('/upload?mode=explore')}
          >
            Back to all rooms
          </Button>
        </div>
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
