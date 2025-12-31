import { useNavigate } from 'react-router-dom';
import { Upload, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroCarousel from '@/components/HeroCarousel';
import { useState } from 'react';

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

type Mode = 'design' | 'replicate' | 'find';

const MODE_CONTENT = {
  design: {
    title: 'Design your space from scratch',
    steps: [
      'Upload your room',
      'We understand layout and constraints',
      'Get space-safe design options and a guided plan'
    ],
    cta: 'Start from my room',
    images: [
      {
        url: '/images/ModernLoftDesign.jpg',
        alt: 'Empty modern loft with floor-to-ceiling windows'
      },
      {
        url: '/images/LuxuryBedroom.jpg',
        alt: 'Empty luxury bedroom with city views'
      },
      {
        url: '/images/OpenConcept.jpg',
        alt: 'Empty open-concept space with natural light'
      }
    ]
  },
  replicate: {
    title: 'Replicate an inspiration',
    steps: [
      'Upload inspiration',
      'AI identifies decor',
      'Get a clear shopping list'
    ],
    cta: 'Upload inspiration',
    images: [
      {
        url: '/images/ModernLivingRoom.jpg',
        alt: 'Luxurious modern living room with bouclé sofa'
      },
      {
        url: '/images/photo1767207550.jpg',
        alt: 'Contemporary bedroom with elegant styling'
      },
      {
        url: '/images/photo1767207550.jpg',
        alt: 'Elegant dining room with live-edge table'
      }
    ]
  },
  find: {
    title: 'Find one item that fits',
    steps: [
      'Choose the item',
      'Enter size and preferences',
      'Find options that fit your space'
    ],
    cta: 'Find what fits',
    images: [
      {
        url: '/images/photo1767207550.jpg',
        alt: 'Modern curved bouclé sofa'
      },
      {
        url: '/images/coffeetable.jpg',
        alt: 'Organic-shaped coffee table'
      },
      {
        url: '/images/DesignerLamp.jpg',
        alt: 'Designer arc floor lamp'
      }
    ]
  }
};

export default function Home() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedMode, setSelectedMode] = useState<Mode>('design');

  const currentContent = MODE_CONTENT[selectedMode];
  const currentImages = currentContent.images;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % currentImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + currentImages.length) % currentImages.length);
  };

  // Reset slide to 0 when mode changes
  const handleModeChange = (mode: Mode) => {
    setSelectedMode(mode);
    setCurrentSlide(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 md:px-6 pt-12 md:pt-20 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto">
          {/* Section 1: Hero Header */}
          <div className="text-center mb-8 space-y-3">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#111111] leading-tight">
              Start with your space, an inspiration, or a single item
            </h1>
            
            <p className="text-lg md:text-xl text-[#555555] max-w-3xl mx-auto">
              Homable helps you design, shop, and track—whether you're decorating a whole room or finding one perfect piece.
            </p>
          </div>

          {/* Section 2: Mode Selector */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-white rounded-full p-1 shadow-md border border-gray-200">
              <button
                onClick={() => handleModeChange('design')}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${
                  selectedMode === 'design'
                    ? 'bg-[#111111] text-white'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Design my space
              </button>
              <button
                onClick={() => handleModeChange('replicate')}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${
                  selectedMode === 'replicate'
                    ? 'bg-[#111111] text-white'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Replicate an inspiration
              </button>
              <button
                onClick={() => handleModeChange('find')}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${
                  selectedMode === 'find'
                    ? 'bg-[#111111] text-white'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Find one item that fits
              </button>
            </div>
          </div>

          {/* Two-Column Layout: Left (Content) + Right (Image Carousel) */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Column: Step Preview Panel */}
            <div className="bg-white rounded-2xl p-8 md:p-10 shadow-lg">
              <h2 className="text-2xl md:text-3xl font-bold text-[#111111] mb-8">
                {currentContent.title}
              </h2>

              <div className="space-y-6 mb-8">
                {currentContent.steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#111111] text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <p className="text-lg text-[#333333] pt-1">{step}</p>
                  </div>
                ))}
              </div>

              {/* Section 4: Primary CTA */}
              <div>
                <Button
                  onClick={() => navigate('/upload')}
                  size="lg"
                  className="w-full bg-[#111111] hover:bg-[#333333] text-white px-10 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                  {currentContent.cta}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Right Column: Large Image Carousel */}
            <div className="relative">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={currentImages[currentSlide].url}
                  alt={currentImages[currentSlide].alt}
                  className="w-full h-full object-cover"
                />
                
                {/* Carousel Controls Overlay */}
                <button
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 hover:bg-white transition-colors shadow-lg"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-6 h-6 text-[#111111]" />
                </button>

                <button
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 hover:bg-white transition-colors shadow-lg"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-6 h-6 text-[#111111]" />
                </button>

                {/* Carousel Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {currentImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentSlide
                          ? 'bg-white w-8'
                          : 'bg-white/50 w-2'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
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
                onClick={() => navigate('/upload')}
                size="lg"
                className="bg-black hover:bg-black/90 text-white px-8 rounded-full"
              >
                Try It Now - It's Free
              </Button>
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
                    src={CAROUSEL_EXAMPLES[currentSlide].image}
                    alt={CAROUSEL_EXAMPLES[currentSlide].imageAlt}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Right: Checklist */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    {CAROUSEL_EXAMPLES[currentSlide].checklist.map((item, index) => (
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
                  onClick={prevSlide}
                  className="p-2 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-5 h-5 text-[#111111]" />
                </button>

                <div className="flex gap-2">
                  {CAROUSEL_EXAMPLES.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentSlide
                          ? 'bg-[#111111] w-6'
                          : 'bg-gray-300'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={nextSlide}
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
            onClick={() => navigate('/upload')}
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