import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import ComingSoonBanner from '@/components/ComingSoonBanner';

const CATEGORY_TILES = [
  { name: 'Sofas', image: '/assets/boucle-sofa.jpg' },
  { name: 'Tables & Chairs', image: '/assets/oval-dining-table.jpg' },
  { name: 'Storage', image: '/assets/compact-desk.jpg' },
  { name: 'Beds', image: '/assets/canopy-bed.jpg' },
  { name: 'Decor', image: '/assets/persian-rug.jpg' },
  { name: 'Lighting', image: '/assets/carousel-living-room-1.jpg' },
  { name: 'Dining', image: '/assets/carousel-dining-room-5.jpg' },
  { name: 'Office', image: '/assets/wood-minimalist-desk.jpg' },
] as const;

const FEATURE_CARDS = [
  {
    title: 'Vendor discovery',
    description: 'Find local furniture makers and shops near you.',
    image: '/assets/sample-afro-modern-dining-3.jpg',
  },
  {
    title: 'Local shopping',
    description: 'Browse Nigerian furniture and decor from your inspiration.',
    image: '/assets/furniture-collection.jpg',
  },
  {
    title: 'Direct connection',
    description: 'Contact vendors directly—no checkout on Homable.',
    image: '/assets/sample-afro-modern-bedroom-2.jpg',
  },
] as const;

const HERO_IMAGE = '/assets/sample-afro-modern-living-1.jpg';

export default function ShopsHome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 flex flex-col">
        {/* 1. Category preview tiles - visual only, not clickable */}
        <section
          className="border-b border-gray-100 bg-[#fafaf9] py-6 md:py-8"
          aria-label="Category preview"
        >
          <div className="overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 px-4 min-w-max md:px-6 lg:px-8 pb-2">
              {CATEGORY_TILES.map(({ name, image }) => (
                <div
                  key={name}
                  className="flex-shrink-0 w-[140px] md:w-[160px] rounded-lg bg-[#f0eeeb] overflow-hidden opacity-90 cursor-default select-none"
                  style={{ cursor: 'default' }}
                  role="img"
                  aria-label={name}
                >
                  <div className="aspect-square w-full bg-gray-200">
                    <img
                      src={image}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      draggable={false}
                    />
                  </div>
                  <p className="text-center text-sm font-medium text-[#333] py-2.5 px-2">
                    {name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Hero: full-width image + text overlay (only CTA clickable) */}
        <section className="relative w-full min-h-[420px] md:min-h-[520px] lg:min-h-[600px]">
          <div className="absolute inset-0">
            <img
              src={HERO_IMAGE}
              alt=""
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"
              aria-hidden
            />
          </div>
          <div className="relative container mx-auto px-4 md:px-6 lg:px-8 h-full min-h-[420px] md:min-h-[520px] lg:min-h-[600px] flex items-center">
            <div className="max-w-xl py-12 md:py-16">
              <div className="inline-flex items-center rounded-md bg-white/95 backdrop-blur-sm px-3 py-1.5 shadow-sm mb-4">
                <ComingSoonBanner className="text-xs px-2 py-0.5 border-0" />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight drop-shadow-sm">
                Homable Shops
              </h1>
              <p className="mt-4 text-lg md:text-xl text-white/95 leading-relaxed max-w-md drop-shadow-sm">
                Discover local Nigerian furniture and decor from your inspiration. We’re building a place to find vendors near you and contact them directly—no checkout on Homable, just discovery and connection.
              </p>
              <p className="mt-3 text-sm md:text-base text-white/85 max-w-md">
                Local listings are launching soon. Check back or upload an inspiration to get item-level links when Shops is live.
              </p>
              <Button
                onClick={() => navigate('/upload')}
                className="mt-6 bg-white text-black hover:bg-white/90 rounded-full font-medium shadow-lg cursor-pointer"
              >
                Upload Inspiration
              </Button>
            </div>
          </div>
        </section>

        {/* 3. Secondary feature cards - visual preview only */}
        <section
          className="border-t border-gray-100 bg-[#fafaf9] py-12 md:py-16"
          aria-label="Coming soon features"
        >
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {FEATURE_CARDS.map(({ title, description, image }) => (
                <div
                  key={title}
                  className="rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm opacity-90 cursor-default select-none"
                  style={{ cursor: 'default' }}
                  role="article"
                  aria-label={title}
                >
                  <div className="aspect-[4/3] bg-gray-200">
                    <img
                      src={image}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      draggable={false}
                    />
                  </div>
                  <div className="p-4 md:p-5">
                    <h3 className="font-semibold text-[#111]">{title}</h3>
                    <p className="mt-1 text-sm text-[#555] leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
