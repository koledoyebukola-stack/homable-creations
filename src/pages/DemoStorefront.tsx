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
        {/* 1. Auto-generated Banner */}
        <section className="relative w-full h-[200px] md:h-[280px] overflow-hidden bg-gradient-to-br from-[#f5f3f0] to-[#e8e5e0]">
          {/* Faded collage background */}
          <div className="absolute inset-0 opacity-20">
            <div className="grid grid-cols-2 h-full">
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
          </div>
          {/* Banner content */}
          <div className="relative h-full flex items-center justify-center px-4">
            <div className="text-center max-w-2xl">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#111] mb-2">
                {VENDOR.name}
              </h1>
              <p className="text-lg md:text-xl text-[#555] font-medium">
                {VENDOR.location}
              </p>
              <p className="text-sm md:text-base text-[#777] mt-1">
                {VENDOR.descriptor}
              </p>
            </div>
          </div>
        </section>

        {/* 2. Vendor Summary Section */}
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
                  className="bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full px-6 py-6 text-base font-medium w-full md:w-auto"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Contact on WhatsApp
                </Button>
                <p className="text-xs text-[#777] text-center md:text-right max-w-xs">
                  Custom-made furniture. Finishes, dimensions, and pricing are discussed directly with the carpenter.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Items Grid */}
        <section className="py-8 md:py-12 bg-[#fafafa]">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-semibold text-[#111] mb-6 md:mb-8">
              Products
            </h2>
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
        </section>
      </main>

      <Footer />
    </div>
  );
}
