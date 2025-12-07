import { useNavigate } from 'react-router-dom';
import { Upload, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import HeroCarousel from '@/components/HeroCarousel';
import PopularProducts from '@/components/PopularProducts';

export default function Home() {
  const navigate = useNavigate();

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
              From everyday home styling to holiday decorating, Homable finds affordable products and gives you a clear budget breakdown so you can recreate any look you love.
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
      <section className="bg-white py-16 md:py-24">
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
                  Share any home styling or holiday decor photo that inspires you — from Pinterest, Instagram, or your own collection.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <h3 className="text-xl font-semibold text-[#111111]">
                  AI Identifies Items
                </h3>
                <p className="text-[#555555]">
                  Our AI analyzes your photo and identifies every decor item, from furniture to trees to ornaments to garland.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <h3 className="text-xl font-semibold text-[#111111]">
                  Get Matches
                </h3>
                <p className="text-[#555555]">
                  Instantly see affordable matches from Amazon, Wayfair, and other top retailers to recreate the look.
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

      {/* Popular Products Section */}
      <section className="bg-gradient-to-br from-gray-50 to-stone-50 py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-[#111111] mb-12">
              Explore Popular Decor Finds
            </h2>
            <PopularProducts />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-gray-100 to-gray-50 rounded-3xl p-8 md:p-12 text-center border border-gray-200">
          <h2 className="text-3xl md:text-4xl font-bold text-[#111111] mb-4">
            Ready to Create Your Dream Space?
          </h2>
          <p className="text-lg text-[#555555] mb-8 max-w-2xl mx-auto">
            Join thousands discovering affordable ways to bring their home decor dreams to life.
          </p>
          <Button
            onClick={() => navigate('/upload')}
            size="lg"
            className="bg-[#111111] hover:bg-[#333333] text-white px-8 py-6 text-lg rounded-full"
          >
            <Upload className="mr-2 h-5 w-5" />
            Start Creating Your Look
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center text-sm text-[#888888]">
            <p>© 2024 Homable Creations. Find your perfect home decor matches.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}