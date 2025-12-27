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

export default function Home() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % CAROUSEL_EXAMPLES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + CAROUSEL_EXAMPLES.length) % CAROUSEL_EXAMPLES.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 md:px-6 pt-12 md:pt-20 pb-16 md:pb-24">
        <div className="max-w-6xl mx-auto">
          {/* Hero Content */}
          <div className="text-center mb-12 md:mb-16 space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#111111] leading-tight">
              Design Beautiful Spaces With Just a Photo
            </h1>
            
            <p className="text-lg md:text-xl text-[#555555] max-w-3xl mx-auto leading-relaxed">
              Homable turns any inspiration photo into a clear list of decor items you can shop for, save, and track. It helps you bring your dream space to life piece by piece, in a way that feels easy and personal.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button
                onClick={() => navigate('/upload')}
                size="lg"
                className="bg-[#111111] hover:bg-[#333333] text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload Your Inspiration
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Hero Carousel */}
          <HeroCarousel />

          {/* Promo Strip */}
          <div className="mt-8 md:mt-12 text-center">
            <p className="text-base md:text-lg text-[#666666] font-medium">
              🎄 Last minute Christmas shoppers: upload your inspiration and find matching decor in minutes.
            </p>
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