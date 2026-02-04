import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Store } from 'lucide-react';
import ComingSoonBanner from '@/components/ComingSoonBanner';

export default function ShopsHome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-stone-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <ComingSoonBanner className="text-sm px-3 py-1" />
          </div>
          <div className="flex justify-center">
            <Store className="h-16 w-16 text-[#C89F7A]" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-[#111111]">
            Homable Shops
          </h1>
          <p className="text-[#555555] leading-relaxed">
            Discover local Nigerian furniture and decor from your inspiration. We’re building a place to find vendors near you and contact them directly—no checkout on Homable, just discovery and connection.
          </p>
          <p className="text-sm text-[#777777]">
            Local listings are launching soon. Check back or upload an inspiration to get item-level links when Shops is live.
          </p>
          <Button
            onClick={() => navigate('/upload')}
            className="bg-black text-white hover:bg-black/90 rounded-full"
          >
            Upload Inspiration
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
