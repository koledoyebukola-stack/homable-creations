import { useNavigate } from 'react-router-dom';
import { Upload, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
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

      {/* Popular Products Section */}
      <section className="bg-white py-16 md:py-20">
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