import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, ArrowLeft, MessageCircle } from 'lucide-react';
import { getProductBySlug, getOtherVendorProducts } from '@/lib/api';
import type { Storefront, VendorProduct } from '@/lib/types';

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
  const [data, setData] = useState<{ storefront: Storefront; product: VendorProduct } | null | undefined>(undefined);
  const [moreProducts, setMoreProducts] = useState<VendorProduct[]>([]);

  useEffect(() => {
    if (!slug) {
      setData(null);
      return;
    }
    getProductBySlug(slug).then(setData);
  }, [slug]);

  // Load more products from same vendor when product is ready
  useEffect(() => {
    if (!data || data.storefront.status !== 'active') {
      setMoreProducts([]);
      return;
    }
    getOtherVendorProducts(data.storefront.id, data.product.id, 4).then(setMoreProducts);
  }, [data]);

  // Redirect for not found or paused storefront
  useEffect(() => {
    if (data === null) {
      navigate('/shops?unavailable=1', { replace: true });
    } else if (data && data.storefront.status === 'paused') {
      navigate('/shops?unavailable=1', { replace: true });
    }
  }, [data, navigate]);

  if (data === undefined) {
    return (
      <div className="min-h-screen flex flex-col bg-[#faf8f5]">
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
    const currentUrl = window.location.href;
    const message = `Hi, I'm interested in the ${product.name}.\n\n${currentUrl}`;
    const url = `${whatsappBase}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5]">
      <Header />
      <main className="flex-1">
        <section className="container mx-auto max-w-4xl px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-xs md:text-sm text-[#555] hover:text-[#111] mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </button>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-[3fr,2fr] gap-0">
              {/* Image */}
              <div className="bg-[#f5f3f0] flex items-center justify-center p-4 md:p-6">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-auto max-h-[420px] object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center text-[#999] text-sm">
                    No image available
                  </div>
                )}
              </div>

              {/* Product info */}
              <div className="p-5 md:p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100">
                <div>
                  {product.category && (
                    <Badge className="mb-3 bg-[#f5e1c2] text-[#7a4c1c] border-0 text-xs font-medium">
                      {product.category}
                    </Badge>
                  )}
                  <h1 className="text-xl md:text-2xl font-semibold text-[#111] leading-snug">
                    {product.name}
                  </h1>
                  <p className="mt-2 text-base md:text-lg font-semibold text-[#1a1a1a]">
                    {formatPrice(product.price_min, product.price_max)}
                  </p>

                  {/* Trust badges */}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="inline-flex items-center rounded-full bg-[#1a1a1a] text-white px-3 py-1">
                      Custom orders available
                    </span>
                    {storefront.location && (
                      <span className="inline-flex items-center rounded-full bg-[#f5e1c2] text-[#7a4c1c] px-3 py-1">
                        Made in {storefront.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Vendor + product details */}
                <div className="mt-6 space-y-4">
                  <div className="space-y-1 text-sm text-[#555]">
                    <p>
                      Sold by{' '}
                      <button
                        type="button"
                        onClick={() => navigate(`/stores/${storefront.slug}`)}
                        className="font-medium text-[#d4734c] hover:underline"
                      >
                        {storefront.name}
                      </button>
                    </p>
                    {storefront.location && (
                      <p className="text-xs md:text-sm text-[#777]">{storefront.location}</p>
                    )}
                    {storefront.description && (
                      <p className="text-xs md:text-sm text-[#666] mt-2">{storefront.description}</p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/stores/${storefront.slug}`)}
                      className="mt-3 rounded-full border-[#d4734c] text-[#d4734c] hover:bg-[#d4734c]/5"
                    >
                      View all products
                    </Button>
                  </div>

                  {/* Product Details */}
                  <div className="mt-4 rounded-xl border border-gray-100 bg-[#faf5ef] p-3 md:p-4 space-y-2">
                    <h2 className="text-xs font-semibold tracking-wide text-[#7a4c1c] uppercase">
                      Product Details
                    </h2>
                    <div className="mt-1 space-y-1.5 text-xs md:text-sm text-[#555]">
                      {product.room && (
                        <div className="flex justify-between gap-3">
                          <span className="font-medium text-[#777]">Room</span>
                          <span className="text-right">{product.room}</span>
                        </div>
                      )}
                      {product.material && (
                        <div className="flex justify-between gap-3">
                          <span className="font-medium text-[#777]">Material</span>
                          <span className="text-right">{product.material}</span>
                        </div>
                      )}
                      <p className="pt-1 text-xs text-[#777]">
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
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Discuss on WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* More from this vendor */}
      {data && moreProducts.length > 0 && (
        <section className="pb-24 md:pb-10">
          <div className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
            <h2 className="text-base md:text-lg font-semibold text-[#1a1a1a]">
              More from {data.storefront.name}
            </h2>
            <div className="mt-3 overflow-x-auto pb-1">
              <div className="flex gap-4 md:grid md:grid-cols-4 md:gap-6 min-w-full">
                {moreProducts.map((p, index) => {
                  const aspectClass =
                    index % 3 === 0 ? 'aspect-[4/5]' : index % 3 === 1 ? 'aspect-[3/4]' : 'aspect-square';
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => navigate(`/shops/products/${p.slug}`)}
                      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left cursor-pointer min-w-[160px]"
                    >
                      <div className={`${aspectClass} w-full bg-gray-100 relative overflow-hidden`}>
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#999] text-xs">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="px-2.5 pt-2.5 pb-3 md:px-3 md:pt-3">
                        <h3 className="text-[13px] md:text-sm font-semibold text-[#222] leading-snug line-clamp-2">
                          {p.name}
                        </h3>
                        <p className="text-xs text-[#666] mt-1">
                          {formatPrice(p.price_min, p.price_max)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Sticky WhatsApp CTA on mobile */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="px-4 py-3">
          <Button
            onClick={handleWhatsAppClick}
            className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full font-semibold py-5 shadow-md"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Discuss on WhatsApp
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
