import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Store, ArrowLeft } from 'lucide-react';
import ComingSoonBanner from '@/components/ComingSoonBanner';

export default function ShopsProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const displayName = slug ? decodeURIComponent(slug).replace(/-/g, ' ') : 'Product';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-stone-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl">
        <div className="space-y-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-[#555555] hover:text-[#111111] -ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <button
              type="button"
              onClick={() => navigate('/shops')}
              className="text-sm text-[#C89F7A] hover:underline font-medium inline-flex items-center gap-1"
            >
              <Store className="h-4 w-4" />
              Shops Home
            </button>
          </div>
          <div className="flex justify-center pt-4">
            <ComingSoonBanner className="text-sm px-3 py-1" />
          </div>
          <h1 className="text-2xl font-bold text-[#111111]">
            {displayName}
          </h1>
          <p className="text-[#555555] leading-relaxed">
            Product detail pages are coming soon. You’ll see photos, price range, vendor info, and WhatsApp or Instagram contact options.
          </p>
          <Button
            onClick={() => navigate('/shops')}
            className="bg-black text-white hover:bg-black/90 rounded-full"
          >
            Back to Shops
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
