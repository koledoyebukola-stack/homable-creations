import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Store, ArrowLeft } from 'lucide-react';
import ComingSoonBanner from '@/components/ComingSoonBanner';

export default function ShopsSearch() {
  const { query } = useParams<{ query: string }>();
  const navigate = useNavigate();
  const displayQuery = query ? decodeURIComponent(query).replace(/-/g, ' ') : '';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-stone-50">
      <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-[#555555] hover:text-[#111111] -ml-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to results
            </Button>
          </div>
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
            {displayQuery ? `“${displayQuery}”` : 'Search'} in local shops
          </h1>
          <p className="text-[#555555] leading-relaxed">
            Local Nigerian listings for this item are coming soon. You’ll be able to see vendors, price ranges, and contact them via WhatsApp or Instagram.
          </p>
          <p className="text-sm text-[#777777]">
            Use the link above to return to Shops, or Back to results to return to your inspiration results.
          </p>
          <div className="flex flex-wrap gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              Back to results
            </Button>
            <Button
              onClick={() => navigate('/shops')}
              className="bg-black text-white hover:bg-black/90 rounded-full"
            >
              Shops Home
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
