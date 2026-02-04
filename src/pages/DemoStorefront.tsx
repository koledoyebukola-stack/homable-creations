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

// Hardcoded product items (8-12 items, Wayfair-style names)
const PRODUCTS = [
  {
    id: 1,
    name: 'Modern Wooden Dining Chair',
    image: '/assets/oval-dining-table.jpg',
    isCustom: true,
  },
  {
    id: 2,
    name: 'Minimalist Coffee Table',
    image: '/assets/carousel-coffee-table-6.jpg',
    isCustom: true,
  },
  {
    id: 3,
    name: 'Upholstered Accent Chair',
    image: '/assets/boucle-sofa.jpg',
    isCustom: true,
  },
  {
    id: 4,
    name: 'Solid Wood TV Console',
    image: '/assets/compact-desk.jpg',
    isCustom: true,
  },
  {
    id: 5,
    name: 'Platform Bed Frame',
    image: '/assets/canopy-bed.jpg',
    isCustom: true,
  },
  {
    id: 6,
    name: 'Wooden Bookshelf Unit',
    image: '/assets/wood-minimalist-desk.jpg',
    isCustom: true,
  },
  {
    id: 7,
    name: 'Dining Table Set',
    image: '/assets/carousel-dining-room-5.jpg',
    isCustom: true,
  },
  {
    id: 8,
    name: 'Sectional Sofa',
    image: '/assets/modular-sectional.jpg',
    isCustom: true,
  },
  {
    id: 9,
    name: 'Storage Cabinet',
    image: '/assets/standing-desk.jpg',
    isCustom: true,
  },
  {
    id: 10,
    name: 'Side Table',
    image: '/assets/pedestal-table.jpg',
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
        {/* 1. Storefront Hero Banner */}
        <section className="relative w-full min-h-[260px] md:min-h-[340px] lg:min-h-[380px] overflow-hidden bg-[#f5f3f0]">
          {/* Faded collage background */}
          <div className="absolute inset-0">
            <div className="grid grid-cols-2 h-full opacity-40">
              <img
                src="/assets/sample-afro-modern-living-1.jpg"
                alt=""
                className="w-full h-full object-cover"
                loading="eager"
              />
              <img
                src="/assets/sample-afro-modern-dining-3.jpg"
                alt=""
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/80 to-transparent" />
          </div>
          {/* Banner content */}
          <div className="relative h-full">
            <div className="container mx-auto h-full max-w-6xl px-4 md:px-6 lg:px-8 flex items-end pb-6 md:pb-10">
              <div className="max-w-xl">
                <p className="inline-flex items-center text-xs font-semibold uppercase tracking-[0.18em] text-[#aa7b3c] mb-3">
                  Homable storefront demo
                </p>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[#111]">
                  {VENDOR.name}
                </h1>
                <p className="mt-2 text-sm md:text-base text-[#555]">
                  {VENDOR.descriptor} · {VENDOR.location}
                </p>
                <p className="mt-3 text-xs md:text-sm text-[#777] max-w-md">
                  A dedicated Homable storefront for showcasing made-to-order pieces, with all
                  enquiries handled directly over WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Vendor Summary Section + Primary CTA */}
        <section className="border-b border-gray-200 bg-white">
          <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-semibold text-[#111] mb-2">
                  {VENDOR.name}
                </h2>
                <p className="text-[#555] mb-3">{VENDOR.location}</p>
                <a
                  href={VENDOR.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#555] hover:text-[#111] transition-colors text-sm"
                >
                  <Instagram className="h-4 w-4" />
                  <span>@ayo_custom_furniture</span>
                </a>
              </div>
              <div ref={whatsappRef} className="flex flex-col gap-3 md:items-end">
                <Button
                  onClick={() => window.open(VENDOR.whatsapp, '_blank')}
                  className="bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full px-6 py-6 text-base font-semibold w-full md:w-auto shadow-md"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Discuss price, size & finish on WhatsApp
                </Button>
                <p className="text-xs text-[#777] text-center md:text-right max-w-xs">
                  Custom-made furniture. Finishes, dimensions, and pricing are agreed directly with the carpenter over WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Store layout: sidebar + items grid (visual only) */}
        <section className="py-8 md:py-12 bg-[#fafafa]">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex flex-col md:flex-row gap-8 md:gap-10">
              {/* Static sidebar categories */}
              <aside className="md:w-56 lg:w-64 shrink-0 bg-white border border-gray-200 rounded-lg p-4 h-max">
                <h3 className="text-sm font-semibold text-[#111] mb-3 tracking-wide uppercase">
                  Categories
                </h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between text-[#111] font-medium cursor-default select-none">
                    <span>All items</span>
                    <span className="text-xs text-[#777]">{PRODUCTS.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#555] cursor-default select-none">
                    <span>Chairs</span>
                    <span className="text-xs text-[#999]">3</span>
                  </div>
                  <div className="flex items-center justify-between text-[#555] cursor-default select-none">
                    <span>Tables</span>
                    <span className="text-xs text-[#999]">3</span>
                  </div>
                  <div className="flex items-center justify-between text-[#555] cursor-default select-none">
                    <span>Beds</span>
                    <span className="text-xs text-[#999]">2</span>
                  </div>
                  <div className="flex items-center justify-between text-[#555] cursor-default select-none">
                    <span>Storage</span>
                    <span className="text-xs text-[#999]">2</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                  <p className="text-xs text-[#777]">
                    Custom orders available for most pieces. Share a reference photo or room
                    measurements over WhatsApp.
                  </p>
                </div>
              </aside>

              {/* Items + sort row */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5 md:mb-6">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-xl md:text-2xl font-semibold text-[#111]">
                        All items
                      </h2>
                      <span className="text-sm text-[#777]">
                        {PRODUCTS.length} items
                      </span>
                    </div>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-[#555] border border-gray-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                      <span className="font-medium">Custom orders available</span>
                    </div>
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

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {PRODUCTS.map((product) => (
                    <button
                      key={product.id}
                      onClick={handleItemClick}
                      className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left cursor-pointer"
                      aria-label={`View ${product.name}`}
                    >
                      <div className="aspect-square w-full bg-gray-100 relative overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {product.isCustom && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-white/95 text-[#111] text-xs font-medium border-0 shadow-sm">
                              Custom order
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-3 md:p-4">
                        <h3 className="text-sm md:text-base font-medium text-[#111] line-clamp-2 group-hover:text-[#555] transition-colors">
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
