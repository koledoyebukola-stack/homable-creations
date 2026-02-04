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

// Hardcoded product items (Wayfair-style names), focused on modern accent seating
const PRODUCTS = [
  {
    id: 1,
    name: 'Upholstered Accent Chair',
    image: '/images/photo1767207963.jpg',
    isCustom: true,
  },
  {
    id: 2,
    name: 'Modern Lounge Chair',
    image: '/images/photo1767207550.jpg',
    isCustom: true,
  },
  {
    id: 3,
    name: 'Curved Walnut Accent Chair',
    image: '/images/photo1767208350.jpg',
    isCustom: true,
  },
  {
    id: 4,
    name: 'Wood Frame Club Chair',
    image: '/images/photo1767208351.jpg',
    isCustom: true,
  },
  {
    id: 5,
    name: 'Solid Wood Dining Chair',
    image: '/images/photo1767212743.jpg',
    isCustom: true,
  },
  {
    id: 6,
    name: 'Minimalist Dining Chair',
    image: '/images/photo1767213004.jpg',
    isCustom: true,
  },
  {
    id: 7,
    name: 'Rounded Bouclé Accent Chair',
    image: '/images/photo1764821192.jpg',
    isCustom: true,
  },
  {
    id: 8,
    name: 'Low Lounge Chair with Bolster',
    image: '/images/photo1764821193.jpg',
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
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        {/* 1. Storefront Hero Banner – Behance-style typography */}
        <section className="border-b border-gray-200 bg-white">
          <div className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-6 md:py-8 lg:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#999]">
              Homable storefront demo
            </p>
            <h1 className="mt-2 text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none uppercase">
              {VENDOR.name}
            </h1>
            <p className="mt-3 text-sm md:text-base text-[#555]">
              {VENDOR.location} · {VENDOR.descriptor}
            </p>
          </div>
        </section>

        {/* 2. Profile / identity + exploratory grid, Behance-style */}
        <section className="bg-[#fafafa] py-8 md:py-10">
          <div className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row gap-8 lg:gap-10">
              {/* Left column: identity & CTA */}
              <aside className="w-full md:w-64 lg:w-72 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-[#f1e5d6] border border-[#e0d2bf] flex items-center justify-center overflow-hidden">
                    <img
                      src="/images/Vendor.jpg"
                      alt="Ayo Custom Furniture logo"
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold text-[#111]">
                      {VENDOR.name}
                    </h2>
                    <p className="text-sm text-[#555]">{VENDOR.location}</p>
                    <a
                      href={VENDOR.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-2 text-xs text-[#555] hover:text-[#111] transition-colors"
                    >
                      <Instagram className="h-4 w-4" />
                      <span>@ayo_custom_furniture</span>
                    </a>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-gray-200 p-4 space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#111] text-white text-xs px-3 py-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                    Custom orders available
                  </div>
                  <p className="text-xs text-[#555]">
                    Made-to-order furniture for homes and apartments. Share a reference photo or room
                    measurements to start your project.
                  </p>
                </div>

                <div ref={whatsappRef} className="space-y-3">
                  <Button
                    onClick={() => window.open(VENDOR.whatsapp, '_blank')}
                    className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full px-6 py-6 text-sm md:text-base font-semibold shadow-md"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Discuss price, size & finish on WhatsApp
                  </Button>
                  <p className="text-xs text-[#777]">
                    Custom-made furniture. Finishes, dimensions, and pricing are agreed directly with
                    the carpenter over WhatsApp.
                  </p>
                </div>
              </aside>

              {/* Right column: filters + visual grid */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 md:mb-5">
                  <div>
                    <h2 className="text-xl md:text-2xl font-semibold text-[#111]">Products</h2>
                    <p className="text-xs text-[#777] mt-1">
                      {PRODUCTS.length} custom pieces · Explore shapes and forms
                    </p>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-3">
                    <span className="text-xs text-[#777] hidden md:inline">
                      Visual demo only – no checkout.
                    </span>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 border border-gray-200 text-xs md:text-sm text-[#555] cursor-default select-none">
                      <span className="text-[#777]">Sort by:</span>
                      <span className="font-medium text-[#111]">Relevance</span>
                    </div>
                  </div>
                </div>

                {/* Visual filters row (non-functional) */}
                <div className="flex flex-wrap items-center gap-2.5 mb-5 md:mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 border border-gray-200 text-xs md:text-sm text-[#555] cursor-default select-none">
                    <span className="font-medium text-[#111]">Category</span>
                    <span className="text-[#777]">Accent chairs, dining chairs</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 border border-gray-200 text-xs md:text-sm text-[#555] cursor-default select-none">
                    <span className="font-medium text-[#111]">Room</span>
                    <span className="text-[#777]">Living, bedroom, studio</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 border border-gray-200 text-xs md:text-sm text-[#555] cursor-default select-none">
                    <span className="font-medium text-[#111]">Material</span>
                    <span className="text-[#777]">Wood, bouclé, mixed</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#111] px-3 py-1.5 text-xs md:text-sm text-white cursor-default select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                    <span className="font-medium">Custom order · On</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {PRODUCTS.map((product) => (
                    <button
                      key={product.id}
                      onClick={handleItemClick}
                      className="group bg-white rounded-2xl overflow-hidden border border-gray-200 text-left cursor-pointer"
                      aria-label={`View ${product.name}`}
                    >
                      <div className="aspect-[3/4] w-full bg-gray-100 relative overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {product.isCustom && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-white/95 text-[#111] text-[10px] font-medium border-0 shadow-sm px-2 py-1 rounded-full">
                              Custom order
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-3 md:p-3.5">
                        <h3 className="text-xs md:text-sm font-medium text-[#111] line-clamp-2 group-hover:text-[#555] transition-colors">
                          {product.name}
                        </h3>
                      </div>
                    </button>
                  ))}
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
            onClick={() => window.open(VENDOR.whatsapp, '_blank')}
            className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full font-semibold py-5 shadow-md"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Discuss price, size & finish on WhatsApp
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
