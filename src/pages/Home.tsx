import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useState, useRef } from 'react';

// Carousel examples showing inspiration photo → checklist
const CAROUSEL_EXAMPLES = [
  {
    id: 1,
    image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-27/f5c2c97d-14f6-4c30-8611-9c97d727c2c6.png',
    imageAlt: 'Modern living room with neutral tones',
    checklist: [
      'Sofa',
      'Area rug',
      'Coffee table',
      'Floor lamp',
      'Throw pillows',
      'Wall art'
    ]
  },
  {
    id: 2,
    image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-27/d8585f08-b5c0-406b-adf3-12ca5b4e4e4f.png',
    imageAlt: 'Cozy bedroom with warm lighting',
    checklist: [
      'Bed frame',
      'Nightstands',
      'Table lamps',
      'Bedding set',
      'Curtains',
      'Decorative mirror'
    ]
  },
  {
    id: 3,
    image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-27/083c7d04-5b8c-4617-80f4-13ba1ddbe422.png',
    imageAlt: 'Elegant dining space',
    checklist: [
      'Dining table',
      'Dining chairs',
      'Pendant light',
      'Sideboard',
      'Table runner',
      'Centerpiece'
    ]
  }
];

// Explore section content (reused from former tab)
const EXPLORE_STEPS = [
  'Browse curated room inspirations',
  'Explore styles, moods, and room types',
  'Choose a look to execute'
];
const EXPLORE_IMAGES = [
  { url: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-31/4a353320-f266-498a-b105-8ffe1b423b27.png', alt: 'Modern minimalist living room' },
  { url: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-31/d105eabc-9e94-443c-b1d2-1da1d1ff381e.png', alt: 'Scandinavian bedroom' },
  { url: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-31/5e43a37b-7c8b-406a-9456-3f811e52767c.png', alt: 'Industrial dining space' }
];

// Mobile hero carousel: 6 room inspo images (reused from carousel + explore)
const MOBILE_HERO_IMAGES = [
  ...CAROUSEL_EXAMPLES.map(({ image, imageAlt }) => ({ url: image, alt: imageAlt })),
  ...EXPLORE_IMAGES
];

export default function Home() {
  const navigate = useNavigate();
  const exploreSectionRef = useRef<HTMLElement>(null);
  const [carouselSlide, setCarouselSlide] = useState(0);
  const [exploreSlide, setExploreSlide] = useState(0);

  const scrollToExplore = () => {
    exploreSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const nextCarousel = () => {
    setCarouselSlide((prev) => (prev + 1) % CAROUSEL_EXAMPLES.length);
  };
  const prevCarousel = () => {
    setCarouselSlide((prev) => (prev - 1 + CAROUSEL_EXAMPLES.length) % CAROUSEL_EXAMPLES.length);
  };
  const nextExplore = () => {
    setExploreSlide((prev) => (prev + 1) % EXPLORE_IMAGES.length);
  };
  const prevExplore = () => {
    setExploreSlide((prev) => (prev - 1 + EXPLORE_IMAGES.length) % EXPLORE_IMAGES.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50">
      <Header />

      {/* Hero Section - 3-tier action hierarchy */}
      <section className="bg-[#f9f9f9] pt-10 pb-10 px-5 md:pt-[80px] md:pb-[80px] md:px-5">
        <div className="max-w-[560px] mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#111111] leading-tight text-center mb-3">
            From inspiration to execution
          </h1>
          {/* Mobile: long subtitle */}
          <p className="md:hidden text-lg text-[#555555] text-center mb-10">
            Homable is a collaborative home setup tool that helps you turn decor inspiration into a clear plan. Upload a room photo to get an instant shopping list, explore curated styles, visualize your space in 3D, and invite friends and family to help you bring it all together.
          </p>
          {/* Desktop: short subtitle */}
          <p className="hidden md:block text-lg md:text-xl text-[#555555] text-center mb-10">
            Homable helps you plan, shop, and track everything needed to get a room done without juggling multiple tools.
          </p>

          {/* Primary: Upload Your Inspiration - no icon on mobile, 56px mobile / 60px desktop */}
          <button
            type="button"
            onClick={() => navigate('/upload?mode=inspiration')}
            className="w-full h-[56px] md:h-[60px] flex items-center justify-center gap-3 rounded-xl mb-4 md:mb-4 bg-[#000000] text-white text-base md:text-[18px] font-semibold hover:bg-[#1a1a1a] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all duration-200"
          >
            <span className="hidden md:inline text-2xl" aria-hidden>📸</span>
            <span>Upload Your Inspiration</span>
          </button>

          {/* Secondary: Explore Styles & Ideas - no icon on mobile, 48px mobile / 48px desktop */}
          <button
            type="button"
            onClick={scrollToExplore}
            className="w-full h-12 md:h-12 flex items-center justify-center gap-2.5 rounded-xl mb-4 md:mb-4 bg-white text-black text-[15px] md:text-base font-medium border-[1.5px] border-[#e0e0e0] hover:border-black hover:bg-[#fafafa] transition-colors"
          >
            <span className="hidden md:inline text-xl" aria-hidden>🎨</span>
            <span>Explore Styles & Ideas</span>
          </button>

          {/* Tertiary: desktop only; on mobile this lives in Explore section */}
          <div className="hidden md:block text-center py-2">
            <button
              type="button"
              onClick={() => navigate('/upload?mode=find')}
              className="text-sm font-normal text-[#666666] hover:text-black hover:underline cursor-pointer inline-block"
            >
              or find one specific item →
            </button>
          </div>

          {/* Mobile-only: inspirational image carousel (below CTAs) */}
          <div className="md:hidden mt-12 mb-16 overflow-hidden">
            <style>{`
              @keyframes mobile-hero-scroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
            `}</style>
            <div className="flex gap-3 w-max" style={{ animation: 'mobile-hero-scroll 24s linear infinite' }}>
              {[...MOBILE_HERO_IMAGES, ...MOBILE_HERO_IMAGES].map((img, i) => (
                <img
                  key={i}
                  src={img.url}
                  alt={img.alt}
                  className="w-[140px] flex-shrink-0 aspect-[4/3] rounded-xl object-cover"
                />
              ))}
            </div>
            <p className="text-center text-sm text-[#666666] mt-3">Thousands of rooms designed</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-gradient-to-br from-gray-50 to-stone-50 py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-[#111111] mb-12 md:mb-16">
              How It Works
            </h2>

            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              {/* Step 1 */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <h3 className="text-xl font-semibold text-[#111111]">
                  Upload Your Photo
                </h3>
                <p className="text-[#555555]">
                  Share any inspiration photo you love, whether it's from Pinterest, Instagram, or your own space.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <h3 className="text-xl font-semibold text-[#111111]">
                  AI Identifies the Decor
                </h3>
                <p className="text-[#555555]">
                  Homable analyzes the photo and gives you a clear list of every decor item it finds, from furniture to textiles to seasonal pieces.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <h3 className="text-xl font-semibold text-[#111111]">
                  Shop and Track Your List
                </h3>
                <p className="text-[#555555]">
                  Use the item names to search for products online and save them as a checklist so you can plan, shop, and decorate at your own pace.
                </p>
              </div>
            </div>

            <div className="text-center mt-12">
              <Button
                onClick={() => navigate('/upload?mode=inspiration')}
                size="lg"
                className="bg-white hover:bg-[#fafafa] text-black border-[1.5px] border-[#e0e0e0] hover:border-black px-8 rounded-xl font-medium"
              >
                Try It Now - It's Free
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Styles & Ideas Section */}
      <section ref={exploreSectionRef} className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-[#111111] mb-12 md:mb-16">
              Explore Styles & Ideas
            </h2>
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="bg-[#f9f9f9] rounded-2xl p-8 md:p-10">
                <div className="space-y-6 mb-8">
                  {EXPLORE_STEPS.map((step, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-[#111111] text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <p className="text-lg text-[#333333] pt-1">{step}</p>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => navigate('/upload?mode=explore')}
                  variant="outline"
                  className="w-full border-[1.5px] border-[#e0e0e0] hover:border-black rounded-xl font-medium"
                >
                  Explore styles
                </Button>
                <div className="text-center mt-3">
                  <button
                    type="button"
                    onClick={() => navigate('/upload?mode=find')}
                    className="text-sm font-normal text-[#666666] hover:text-black hover:underline cursor-pointer"
                  >
                    Or find one specific item →
                  </button>
                </div>
              </div>
              <div className="relative">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
                  <img
                    src={EXPLORE_IMAGES[exploreSlide].url}
                    alt={EXPLORE_IMAGES[exploreSlide].alt}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={prevExplore}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 hover:bg-white transition-colors shadow-lg"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="w-6 h-6 text-[#111111]" />
                  </button>
                  <button
                    onClick={nextExplore}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 hover:bg-white transition-colors shadow-lg"
                    aria-label="Next"
                  >
                    <ChevronRight className="w-6 h-6 text-[#111111]" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {EXPLORE_IMAGES.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setExploreSlide(i)}
                        className={`h-2 rounded-full transition-all ${
                          i === exploreSlide ? 'bg-white w-8' : 'bg-white/50 w-2'
                        }`}
                        aria-label={`Slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* From Inspiration to Shopping List Section */}
      <section className="bg-white py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-[#111111]">
                From Inspiration to a Clear Shopping List
              </h2>
              <p className="text-base md:text-lg text-[#555555]">
                See how a single photo turns into an organized list you can save and come back to when you're ready.
              </p>
            </div>

            {/* Carousel */}
            <div className="relative bg-gradient-to-br from-gray-50 to-white rounded-3xl p-6 md:p-8 shadow-lg mb-8">
              <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
                {/* Left: Inspiration Photo */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
                  <img
                    src={CAROUSEL_EXAMPLES[carouselSlide].image}
                    alt={CAROUSEL_EXAMPLES[carouselSlide].imageAlt}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Right: Checklist */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    {CAROUSEL_EXAMPLES[carouselSlide].checklist.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200"
                      >
                        <div className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0" />
                        <span className="text-[#111111] font-medium">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs text-[#777777] mb-2">
                      Example list generated by Homable
                    </p>
                    <p className="text-sm text-[#555555] italic">
                      Saved as a checklist. Buy when you're ready.
                    </p>
                  </div>
                </div>
              </div>

              {/* Carousel Controls */}
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={prevCarousel}
                  className="p-2 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-5 h-5 text-[#111111]" />
                </button>

                <div className="flex gap-2">
                  {CAROUSEL_EXAMPLES.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCarouselSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === carouselSlide
                          ? 'bg-[#111111] w-6'
                          : 'bg-gray-300'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={nextCarousel}
                  className="p-2 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-5 h-5 text-[#111111]" />
                </button>
              </div>
            </div>

            {/* Social Proof */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-6 max-w-3xl mx-auto">
              <p className="text-base text-[#333333] italic text-center">
                "I like how I'm able to see everything I need to replicate the idea. The job is half done for me."
              </p>
            </div>

            {/* Footer Microcopy */}
            <div className="text-center">
              <p className="text-sm text-[#777777]">
                No pressure to buy. Your list stays saved for when you're ready.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto bg-black rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Create Your Dream Space?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands discovering affordable ways to bring their home decor dreams to life.
          </p>
          <Button
            onClick={() => navigate('/upload?mode=inspiration')}
            size="lg"
            className="bg-white hover:bg-gray-100 text-black px-8 py-6 text-lg rounded-full"
          >
            <Upload className="mr-2 h-5 w-5" />
            Start Creating Your Look
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}