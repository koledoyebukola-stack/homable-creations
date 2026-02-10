import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
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

  const customBuildTotal = customBuildItems.reduce((sum, i) => sum + (i.estimated_price_ngn ?? 0), 0);
  const decorTotal = decorItems.reduce((sum, i) => sum + (i.estimated_price_ngn ?? 0), 0);

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

        {/* Budget Summary Card */}
        <section className="mb-10 p-6 rounded-2xl bg-white border border-[#e5e5e5] shadow-sm">
          <h2 className="text-xl font-semibold text-[#111111] mb-4">Budget Summary</h2>
          <ul className="space-y-2 text-[#333333]">
            <li className="flex justify-between">
              <span>Available on Homable</span>
              <span className="font-medium">{formatNgn(scene.available_budget_ngn)}</span>
            </li>
            <li className="flex justify-between">
              <span>Custom Builds</span>
              <span className="font-medium">{formatNgn(customBuildTotal)}</span>
            </li>
            <li className="flex justify-between">
              <span>Decor & Styling</span>
              <span className="font-medium">{formatNgn(decorTotal)}</span>
            </li>
            <li className="flex justify-between pt-2 border-t border-[#e5e5e5]">
              <span className="font-semibold">Total</span>
              <span className="font-semibold">{formatNgn(scene.total_budget_ngn)}</span>
            </li>
          </ul>
        </section>

        {/* Section A: Available on Homable */}
        {catalogItems.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-[#111111] mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Available on Homable
            </h2>
            <ul className="space-y-6">
              {catalogItems.map((item) => {
                const product = item.vendor_product;
                const storefront = item.storefront;
                if (!product) return null;
                return (
                  <li
                    key={item.id}
                    className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-white border border-[#e5e5e5]"
                  >
                    <div className="w-full sm:w-32 aspect-square rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={product.image_url || 'https://placehold.co/200/f5f5f5/999?text=Product'}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#111111]">{product.name}</h3>
                      <p className="text-[#555555] text-sm mt-0.5">{formatVendorPrice(product)}</p>
                      {storefront && (
                        <p className="text-sm text-[#666666] mt-1">Vendor: {storefront.name}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                          onClick={() => navigate(`/shops/products/${product.slug}`)}
                        >
                          View Product
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-lg bg-[#111111] hover:bg-[#333]"
                          onClick={() => {
                            // Auth placeholder: will wire when auth flow is defined
                            // toast or modal "Sign in to add to list"
                          }}
                        >
                          Add to Shopping List
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
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
                  {item.estimated_price_ngn != null && (
                    <p className="text-[#555555] text-sm mt-1">
                      Estimated: {formatNgn(item.estimated_price_ngn)}
                    </p>
                  )}
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
                  {item.estimated_price_ngn != null && (
                    <p className="text-[#555555] text-sm mt-1">
                      Estimated: {formatNgn(item.estimated_price_ngn)}
                    </p>
                  )}
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
