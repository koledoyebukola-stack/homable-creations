import { useRef } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Instagram, MessageCircle } from 'lucide-react';

// Hardcoded demo vendor data
const VENDOR = {
  name: 'Ayo Custom Furniture',
  location: 'Lagos, Nigeria',
  descriptor: 'Custom Furniture & Carpentry',
  instagram: 'https://instagram.com/ayo_custom_furniture',
  whatsapp: 'https://wa.me/2341234567890', // Placeholder number
} as const;

// Hardcoded product items (Wayfair-style names), using curated modern chairs/sofas
const PRODUCTS = [
  {
    id: 1,
    name: 'Bouclé Lounge Chair',
    image: '/assets/boucle-sofa.jpg',
    isCustom: true,
  },
  {
    id: 2,
    name: 'Curved Accent Chair',
    image: '/assets/curved-sofa.jpg',
    isCustom: true,
  },
  {
    id: 3,
    name: 'Low Leather Lounge Chair',
    image: '/assets/low-leather-sofa.jpg',
    isCustom: true,
  },
  {
    id: 4,
    name: 'Modular Sectional Sofa',
    image: '/assets/modular-sectional.jpg',
    isCustom: true,
  },
  {
    id: 5,
    name: 'Compact Loveseat Sofa',
    image: '/assets/small-loveseat.jpg',
    isCustom: true,
  },
  {
    id: 6,
    name: 'Chaise Sectional Sofa',
    image: '/assets/chaise-sectional.jpg',
    isCustom: true,
  },
  {
    id: 7,
    name: 'Scandinavian Living Sofa',
    image: '/assets/carousel-living-room-1.jpg',
    isCustom: true,
  },
  {
    id: 8,
    name: 'Modern Sofa with Ottoman',
    image: '/images/Sofa.jpg',
    isCustom: true,
  },
] as const;

export default function DemoStorefront() {
  const whatsappRef = useRef<HTMLDivElement>(null);

  const handleItemClick = () => {
    // Scroll to WhatsApp CTA
    whatsappRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5]">
      <Header />

      <main className="flex-1">
        {/* 1. Vendor hero – warm craft theme */}
        <section className="relative border-b border-[#2a2a2a] bg-[#1a1a1a]">
          <div className="absolute inset-0 opacity-40">
            <div className="w-full h-full bg-[radial-gradient(circle_at_top_left,#d4734c33,transparent_55%),radial-gradient(circle_at_bottom_right,#f5e1c233,transparent_55%)]" />
          </div>
          <div className="relative container mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8 md:py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-8">
              {/* Left: vendor photo */}
              <div className="flex justify-center md:justify-start">
                <div className="h-24 w-24 md:h-28 md:w-28 rounded-full border-4 border-[#d4734c] bg-black/60 overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
                  <img
                    src="/images/Vendor.jpg"
                    alt="Ayo Custom Furniture"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Center: vendor identity */}
              <div className="flex-1 text-center md:text-left text-white">
                <h1 className="text-2xl md:text-3xl lg:text-[32px] font-bold tracking-tight">
                  {VENDOR.name}
                </h1>
                <p className="mt-1 text-sm md:text-base text-white/80">
                  {VENDOR.location} · {VENDOR.descriptor}
                </p>
                <a
                  href={VENDOR.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-xs md:text-sm text-white/80 hover:text-white transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                  <span>@ayo_custom_furniture</span>
                </a>
              </div>

              {/* Right: custom orders badge (desktop) */}
              <div className="hidden md:flex flex-col items-end gap-3 text-xs text-white/80">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                  <span className="font-medium text-white text-xs">
                    Custom orders available
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Products – full-width craft showcase */}
        <section className="py-8 md:py-10">
          <div className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
            {/* Filters / metadata */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-lg md:text-xl font-semibold text-[#1a1a1a]">
                Signature pieces
              </h2>
              <p className="mt-1 text-xs md:text-sm text-[#666]">
                {PRODUCTS.length} custom-made chairs and seating forms, crafted to order.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 text-xs md:text-sm px-3 py-1 font-medium">
                  Accent chairs
                </span>
                <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 text-xs md:text-sm px-3 py-1 font-medium">
                  Dining chairs
                </span>
                <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-800 text-xs md:text-sm px-3 py-1 font-medium">
                  Living room
                </span>
                <span className="inline-flex items-center rounded-full bg-pink-100 text-pink-800 text-xs md:text-sm px-3 py-1 font-medium">
                  Bedroom
                </span>
              </div>
            </div>

            {/* Product grid – masonry feel via varied aspect ratios */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {PRODUCTS.map((product, index) => {
                const aspectClass =
                  index % 3 === 0 ? 'aspect-[4/5]' : index % 3 === 1 ? 'aspect-[3/4]' : 'aspect-square';
                return (
                  <button
                    key={product.id}
                    onClick={handleItemClick}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left cursor-pointer transform hover:-translate-y-1"
                    aria-label={`View ${product.name}`}
                  >
                    <div
                      className={`${aspectClass} w-full bg-gray-100 relative overflow-hidden rounded-2xl`}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-[#d4734c] text-white text-[10px] font-medium border-0 shadow-sm px-2 py-1 rounded-full">
                          Custom order
                        </Badge>
                      </div>
                    </div>
                    <div className="px-2.5 pt-2.5 pb-3 md:px-3 md:pt-3">
                      <h3 className="text-[13px] md:text-sm font-semibold text-[#222] leading-snug">
                        {product.name}
                      </h3>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Anchor for scroll-to-WhatsApp from product cards */}
      <div ref={whatsappRef} className="h-0" />

      {/* Floating WhatsApp CTA on desktop */}
      <div className="hidden md:flex fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => window.open(VENDOR.whatsapp, '_blank')}
          className="bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full px-6 py-5 text-sm font-semibold shadow-[0_12px_35px_rgba(0,0,0,0.5)]"
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Discuss on WhatsApp
        </Button>
      </div>

      {/* Sticky WhatsApp CTA on mobile only */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="px-4 py-3">
          <Button
            onClick={() => window.open(VENDOR.whatsapp, '_blank')}
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
