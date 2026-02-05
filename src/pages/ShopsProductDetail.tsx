import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, ArrowLeft, MessageCircle } from 'lucide-react';
import { getProductBySlug } from '@/lib/api';
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

  useEffect(() => {
    if (!slug) {
      setData(null);
      return;
    }
    getProductBySlug(slug).then(setData);
  }, [slug]);

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
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
                </div>

                <div className="mt-6 space-y-2 text-sm text-[#555]">
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
                  {storefront.location && <p className="text-xs md:text-sm text-[#777]">{storefront.location}</p>}
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
