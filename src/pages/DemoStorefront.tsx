import { useRef, useState, useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Instagram, MessageCircle } from 'lucide-react';

// Hardcoded demo: decor store
const VENDOR = {
  name: 'Lagos Home Decor',
  location: 'Lagos, Nigeria',
  descriptor: 'Home Decor & Interior Accessories',
  description: 'Modern home accessories and decor pieces for contemporary Nigerian homes.',
  instagram_handle: 'lagoshomedecor',
  whatsapp: 'https://wa.me/2348012345678',
  active_since: 'February 2026',
} as const;

const PRODUCTS = [
  { id: 1, name: 'Modern Geometric Area Rug', price: 45000, category: 'Rugs', room: 'Living Room', image: 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=800' },
  { id: 3, name: 'Minimalist Textured Rug', price: 38000, category: 'Rugs', room: 'Dining Room', image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800' },
  { id: 4, name: 'Modern Chandelier', price: 85000, category: 'Lighting', room: 'Living Room', image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800' },
  { id: 5, name: 'Contemporary Pendant Light', price: 42000, category: 'Lighting', room: 'Dining Room', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800' },
  { id: 6, name: 'Designer Floor Lamp', price: 35000, category: 'Lighting', room: 'Bedroom', image: 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=800' },
  { id: 7, name: 'Abstract Canvas Print', price: 28000, category: 'Artwork', room: 'Living Room', image: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800' },
  { id: 8, name: 'Modern Wall Art', price: 32000, category: 'Artwork', room: 'Bedroom', image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800' },
  { id: 9, name: 'Contemporary Artwork', price: 40000, category: 'Artwork', room: 'Dining Room', image: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800' },
  { id: 10, name: 'Round Wall Mirror', price: 25000, category: 'Mirrors', room: 'Bedroom', image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=800' },
  { id: 11, name: 'Modern Decorative Mirror', price: 30000, category: 'Mirrors', room: 'Living Room', image: 'https://images.unsplash.com/photo-1595814432314-90095f342694?w=800' },
  { id: 12, name: 'Contemporary Mirror Set', price: 48000, category: 'Mirrors', room: 'Bathroom', image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800' },
  { id: 13, name: 'Modern Side Table', price: 55000, category: 'Accent Tables', room: 'Living Room', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800' },
  { id: 14, name: 'Contemporary Accent Table', price: 62000, category: 'Accent Tables', room: 'Bedroom', image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800' },
  { id: 15, name: 'Minimalist Console Table', price: 75000, category: 'Accent Tables', room: 'Living Room', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800' },
  { id: 16, name: 'Modern Ceramic Vase', price: 15000, category: 'Decorative Items', room: 'Living Room', image: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800' },
  { id: 17, name: 'Designer Flower Vase Set', price: 22000, category: 'Decorative Items', room: 'Dining Room', image: 'https://images.unsplash.com/photo-1615486511484-92e172cc4fe0?w=800' },
  { id: 18, name: 'Contemporary Plant Pot', price: 18000, category: 'Decorative Items', room: 'Bedroom', image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800' },
];

function formatPrice(price: number): string {
  return `₦${price.toLocaleString()}`;
}

export default function DemoStorefront() {
  const whatsappRef = useRef<HTMLDivElement>(null);
  const [roomFilter, setRoomFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([15000, 85000]);
  const priceBounds: [number, number] = [15000, 85000];

  const rooms = useMemo(() => {
    const set = new Set(PRODUCTS.map(p => p.room));
    return Array.from(set).sort();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(PRODUCTS.map(p => p.category));
    return Array.from(set).sort();
  }, []);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter(p => {
      if (roomFilter && p.room !== roomFilter) return false;
      if (categoryFilter && p.category !== categoryFilter) return false;
      const [min, max] = priceRange;
      if (p.price < min || p.price > max) return false;
      return true;
    });
  }, [roomFilter, categoryFilter, priceRange]);

  const handleItemClick = () => {
    whatsappRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative border-b border-gray-900 bg-gray-900 min-h-[200px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#4b556333,transparent_55%),radial-gradient(circle_at_bottom_right,#11182733,transparent_55%)]" />
          <div className="relative container mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8 md:py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-8">
              <div className="flex justify-center md:justify-start">
                <div className="h-24 w-24 md:h-28 md:w-28 rounded-full border-4 border-gray-300 bg-black/70 overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
                  <div className="h-full w-full flex items-center justify-center text-white text-2xl font-bold">
                    {VENDOR.name.slice(0, 2).toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left text-white">
                <h1 className="text-2xl md:text-3xl lg:text-[32px] font-bold tracking-tight">
                  {VENDOR.name}
                </h1>
                <p className="mt-1 text-sm md:text-base text-white/80">
                  {VENDOR.location} · {VENDOR.descriptor}
                </p>
                {VENDOR.description && (
                  <p className="mt-2 text-xs md:text-sm text-white/80 max-w-md">{VENDOR.description}</p>
                )}
                {VENDOR.active_since && (
                  <p className="mt-1 text-[11px] md:text-xs text-white/60">
                    Active since {VENDOR.active_since}
                  </p>
                )}
                <a
                  href={`https://instagram.com/${VENDOR.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-xs md:text-sm text-white/80 hover:text-white transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                  @{VENDOR.instagram_handle}
                </a>
              </div>
              <div className="hidden md:flex flex-col items-end gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                  <span className="font-medium text-white text-xs">Custom orders available</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Products + filters */}
        <section className="py-8 md:py-10">
          <div className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">Signature pieces</h2>
            <p className="mt-1 text-xs md:text-sm text-gray-600">
              {PRODUCTS.length} home decor and interior accessories.
            </p>

            {/* Room filter */}
            <div className="mt-4">
              <span className="text-xs font-medium text-gray-600">Room</span>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRoomFilter(null)}
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs md:text-sm font-medium transition-colors ${
                    roomFilter === null ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                {rooms.map(room => (
                  <button
                    key={room}
                    type="button"
                    onClick={() => setRoomFilter(room)}
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs md:text-sm font-medium transition-colors ${
                      roomFilter === room ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {room}
                  </button>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div className="mt-4">
              <span className="text-xs font-medium text-gray-600">Category</span>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryFilter(null)}
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs md:text-sm font-medium transition-colors ${
                    categoryFilter === null ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs md:text-sm font-medium transition-colors ${
                      categoryFilter === cat ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Price range */}
            <div className="mt-4 max-w-xs">
              <label className="text-xs font-medium text-gray-600">Price range</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="range"
                  min={priceBounds[0]}
                  max={priceBounds[1]}
                  value={priceRange[0]}
                  onChange={e => {
                    const v = Number(e.target.value);
                    setPriceRange([v, Math.max(v, priceRange[1])]);
                  }}
                  className="flex-1 h-2 rounded-full accent-gray-900"
                />
                <input
                  type="range"
                  min={priceBounds[0]}
                  max={priceBounds[1]}
                  value={priceRange[1]}
                  onChange={e => {
                    const v = Number(e.target.value);
                    setPriceRange([Math.min(v, priceRange[0]), v]);
                  }}
                  className="flex-1 h-2 rounded-full accent-gray-900"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-gray-600 gap-2">
                <span>Min: ₦{priceRange[0].toLocaleString()}</span>
                <span>Max: ₦{priceRange[1].toLocaleString()}</span>
                <button
                  type="button"
                  onClick={() => setPriceRange(priceBounds)}
                  className="ml-2 text-gray-500 hover:text-gray-900 underline-offset-2 hover:underline"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-6">
              {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={handleItemClick}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left cursor-pointer flex flex-col"
                    aria-label={product.name}
                  >
                    <div className="aspect-[3/4] w-full bg-gray-100 relative overflow-hidden rounded-2xl flex-shrink-0">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
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
                      <p className="text-xs text-gray-600 mt-1">{formatPrice(product.price)}</p>
                    </div>
                  </button>
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <p className="text-gray-600 py-8 text-center">No products match the current filters.</p>
            )}
          </div>
        </section>
      </main>

      <div ref={whatsappRef} className="h-0" />

      <div className="hidden md:flex fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => window.open(VENDOR.whatsapp, '_blank')}
          className="bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full px-6 py-5 text-sm font-semibold shadow-[0_12px_35px_rgba(0,0,0,0.5)]"
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Discuss on WhatsApp
        </Button>
      </div>

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
