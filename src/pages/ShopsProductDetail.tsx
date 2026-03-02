import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, ArrowLeft, MessageCircle } from 'lucide-react';
import { getProductBySlug, getOtherVendorProducts, getInspirationsByProduct, getExploreSceneBySlug } from '@/lib/api';
import type { Storefront, VendorProduct, ExploreScene } from '@/lib/types';
import { trackProductContactedOnWhatsApp } from '@/lib/analytics-ng';

function formatPrice(min: number | null, max: number | null): string {
  if (min != null && max != null && min !== max) return `₦${min.toLocaleString()} – ₦${max.toLocaleString()}`;
  if (min != null) return `From ₦${min.toLocaleString()}`;
  if (max != null) return `From ₦${max.toLocaleString()}`;
  return 'Price on request';
}

function whatsappUrl(number: string): string {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

export default function ShopsProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<{ storefront: Storefront; product: VendorProduct } | null | undefined>(undefined);
  const [moreProducts, setMoreProducts] = useState<VendorProduct[]>([]);
  const [inspirations, setInspirations] = useState<ExploreScene[]>([]);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [sceneHeroImageUrl, setSceneHeroImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setData(null);
      return;
    }
    getProductBySlug(slug).then(setData);
  }, [slug]);

  // Always scroll to top when slug (product) changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Load more products from same vendor when product is ready
  useEffect(() => {
    if (!data || data.storefront.status !== 'active') {
      setMoreProducts([]);
      return;
    }
    getOtherVendorProducts(data.storefront.id, data.product.id, 4).then(setMoreProducts);
  }, [data]);

  // Load inspirations where this product appears
  useEffect(() => {
    if (!data || data.storefront.status !== 'active') {
      setInspirations([]);
      return;
    }
    getInspirationsByProduct(data.product.id).then(setInspirations);
  }, [data]);

  // If user came from an explore scene, fetch that scene to get its hero_image_url for WhatsApp prefill
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const fromSceneSlug = searchParams.get('fromSceneSlug');
    if (!fromSceneSlug) {
      setSceneHeroImageUrl(null);
      return;
    }
    getExploreSceneBySlug(fromSceneSlug).then((result) => {
      if (result && result.scene && result.scene.hero_image_url) {
        setSceneHeroImageUrl(result.scene.hero_image_url);
      } else {
        setSceneHeroImageUrl(null);
      }
    });
  }, [location.search]);

  // Redirect for not found or paused storefront
  useEffect(() => {
    if (data === null) {
      navigate('/shops?unavailable=1', { replace: true });
    } else if (data && data.storefront.status === 'paused') {
      navigate('/shops?unavailable=1', { replace: true });
    }
  }, [data, navigate]);

  // Full-screen image overlay: ESC to close, lock body scroll
  useEffect(() => {
    if (!isImageOpen) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsImageOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [isImageOpen]);

  if (data === undefined) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center py-24">
          <p className="text-[#666]">Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!data || data.storefront.status !== 'active') {
    // Redirect effect above will navigate away
    return null;
  }

  const { storefront, product } = data;
  const whatsappBase = whatsappUrl(storefront.whatsapp_number);

  const handleWhatsAppClick = () => {
    const origin = window.location.origin;
    const productUrl = `${origin}/shops/products/${product.slug}`;
    let message = `Hi, I'm interested in the ${product.name}.\n\n${productUrl}`;
    if (sceneHeroImageUrl) {
      message += `\n\nRoom inspiration: ${sceneHeroImageUrl}\nI'd like it made to match the color and style shown in the room image.`;
    }
    const url = `${whatsappBase}?text=${encodeURIComponent(message)}`;
    const searchParams = new URLSearchParams(location.search);
    const fromSceneSlug = searchParams.get('fromSceneSlug');
    trackProductContactedOnWhatsApp({
      vendor_id: storefront.id,
      product_id: product.id,
      source: fromSceneSlug ? 'explore_detail' : 'product_detail',
      from_scene_slug: fromSceneSlug ?? undefined,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <section className="container mx-auto max-w-4xl px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-xs md:text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </button>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-[3fr,2fr] gap-0">
              {/* Image */}
              <div className="bg-gray-100 flex items-center justify-center p-4 md:p-6">
                {product.image_url ? (
                  <button
                    type="button"
                    onClick={() => setIsImageOpen(true)}
                    className="w-full h-auto max-h-[420px] flex items-center justify-center cursor-zoom-in"
                  >
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full max-h-[420px] object-cover object-center rounded-xl shadow-md"
                    />
                  </button>
                ) : (
                  <div className="w-full h-64 flex items-center justify-center text-gray-500 text-sm">
                    No image available
                  </div>
                )}
              </div>

              {/* Product info */}
              <div className="p-5 md:p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100">
                <div>
                  {product.category && (
                    <Badge className="mb-3 bg-gray-100 text-gray-700 border border-gray-200 text-xs font-medium">
                      {product.category}
                    </Badge>
                  )}
                  <h1 className="text-xl md:text-2xl font-semibold text-gray-900 leading-snug">
                    {product.name}
                  </h1>
                  <p className="mt-2 text-base md:text-lg font-semibold text-gray-900">
                    {formatPrice(product.price_min, product.price_max)}
                  </p>

                  {/* Trust badges */}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="inline-flex items-center rounded-full bg-gray-900 text-white px-3 py-1">
                      Custom orders available
                    </span>
                    {storefront.location && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1">
                        Made in {storefront.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Vendor + product details */}
                <div className="mt-6 space-y-4">
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      Sold by{' '}
                      <button
                        type="button"
                        onClick={() => navigate(`/stores/${storefront.slug}`)}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {storefront.name}
                      </button>
                    </p>
                    {storefront.location && (
                      <p className="text-xs md:text-sm text-gray-500">{storefront.location}</p>
                    )}
                    {storefront.description && (
                      <p className="text-xs md:text-sm text-gray-600 mt-2">{storefront.description}</p>
                    )}
                    <div className="mt-3 flex flex-row gap-3 items-center">
                      <Button
                        type="button"
                        onClick={handleWhatsAppClick}
                        className="w-12 h-12 flex-shrink-0 rounded-full bg-[#25D366] hover:bg-[#20BA5A] text-white p-0 flex items-center justify-center shadow-md"
                        aria-label="Buy on WhatsApp"
                      >
                        <MessageCircle className="h-6 w-6" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/stores/${storefront.slug}`)}
                        className="flex-initial rounded-full border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-gray-900 py-2 px-3 text-xs md:py-2 md:px-4 md:text-sm"
                      >
                        {storefront.name
                          ? `More from ${storefront.name.split(/\s+/).slice(0, 2).join(' ')}`
                          : 'More from this vendor'}
                      </Button>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 md:p-4 space-y-2">
                    <h2 className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
                      Product Details
                    </h2>
                    <div className="mt-1 space-y-1.5 text-xs md:text-sm text-gray-600">
                      {product.room && (
                        <div className="flex justify-between gap-3">
                          <span className="font-medium text-gray-500">Room</span>
                          <span className="text-right">{product.room}</span>
                        </div>
                      )}
                      {product.material && (
                        <div className="flex justify-between gap-3">
                          <span className="font-medium text-gray-500">Material</span>
                          <span className="text-right">{product.material}</span>
                        </div>
                      )}
                      <p className="pt-1 text-xs text-gray-500">
                        Custom-made furniture crafted to order. Contact vendor for exact dimensions and
                        customization options.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 hidden md:block">
                  <Button
                    onClick={handleWhatsAppClick}
                    className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full font-semibold py-3 shadow-md"
                    aria-label="Buy on WhatsApp"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Buy on WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* See How to Style - inspirations where this product appears */}
        {inspirations.length > 0 && (
          <section className="pb-8 md:pb-10">
            <div className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3">
                See how to style this {product.name}
              </h2>
              <div className="overflow-x-auto pb-1 scroll-pills-hide-scrollbar md:overflow-visible">
                <div className="flex gap-4 md:grid md:grid-cols-2 md:gap-6 min-w-full">
                  {inspirations.map((scene) => (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => navigate(`/explore/${scene.slug}`)}
                      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left cursor-pointer min-w-[280px] md:min-w-0 flex flex-col"
                    >
                      <div className="aspect-[4/3] w-full bg-gray-100 relative overflow-hidden flex-shrink-0">
                        {scene.hero_image_url ? (
                          <img
                            src={scene.hero_image_url}
                            alt={scene.title}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="px-3 pt-3 pb-4">
                        <h3 className="text-sm md:text-base font-semibold text-gray-900 leading-snug line-clamp-2">
                          {scene.title}
                        </h3>
                        <p className="text-xs text-gray-600 mt-1.5">
                          From ₦{scene.catalog_budget_ngn.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Tap to view details →
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* More from this vendor */}
      {data && moreProducts.length > 0 && (
        <section className="pb-24 md:pb-10">
          <div className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">
              More from {data.storefront.name}
            </h2>
            <div className="mt-3 overflow-x-auto pb-1">
              <div className="flex gap-4 md:grid md:grid-cols-4 md:gap-6 min-w-full">
                {moreProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => navigate(`/shops/products/${p.slug}`)}
                      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left cursor-pointer min-w-[160px] flex flex-col"
                    >
                      <div className="aspect-[3/4] w-full bg-gray-100 relative overflow-hidden flex-shrink-0">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="px-2.5 pt-2.5 pb-3 md:px-3 md:pt-3">
                        <h3 className="text-[13px] md:text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                          {p.name}
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          {formatPrice(p.price_min, p.price_max)}
                        </p>
                      </div>
                    </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Full-screen image overlay */}
      {isImageOpen && product.image_url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 md:p-8 transition-opacity"
          onClick={() => setIsImageOpen(false)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsImageOpen(false)}
              className="absolute top-3 right-3 rounded-full bg-black/60 hover:bg-black text-white p-2 text-xs md:text-sm"
            >
              ×
            </button>
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover object-center rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Sticky WhatsApp CTA on mobile - fixed to viewport bottom for consistent stickiness when scrolling up/down */}
      <div className="md:hidden fixed left-0 right-0 bottom-0 w-full z-40 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="px-4 py-3 pb-[env(safe-area-inset-bottom,0)]">
          <Button
            onClick={handleWhatsAppClick}
            className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full font-semibold py-5 shadow-md"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Buy on WhatsApp
          </Button>
        </div>
      </div>

      {/* More from this vendor */}
    </div>
  );
}
