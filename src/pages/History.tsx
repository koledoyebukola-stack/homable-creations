import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCombinedHistory } from '@/lib/api';
import { HistoryItem } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Image as ImageIcon, FileText, Plus } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const CATEGORY_LABELS: Record<string, string> = {
  'sofa': 'Sofa / Sectional',
  'dining-table': 'Dining Table',
  'rug': 'Rug',
  'bed': 'Bed Frame',
  'desk': 'Desk'
};

// Thumbnail images for each category
const CATEGORY_THUMBNAILS: Record<string, string> = {
  'sofa': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop',
  'dining-table': 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&h=300&fit=crop',
  'rug': 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=400&h=300&fit=crop',
  'bed': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=300&fit=crop',
  'desk': 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=300&fit=crop'
};

export default function History() {
  const navigate = useNavigate();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCombinedHistory();
      setHistoryItems(data);
    } catch (err: unknown) {
      console.error('Failed to load history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleItemClick = (item: HistoryItem) => {
    if (item.type === 'inspiration') {
      navigate(`/product-matches/${item.board_id}`);
    } else {
      // Navigate to specs results with data
      const queryParams = new URLSearchParams();
      queryParams.set('category', item.category || '');
      queryParams.set('data', JSON.stringify(item.specifications || {}));
      navigate(`/specs-results?${queryParams.toString()}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadHistory}>Try Again</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-[#111111]">My History</h1>
            {historyItems.length > 0 && (
              <Button
                onClick={() => navigate('/upload')}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Project</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>
          <p className="text-gray-600">
            Your saved inspirations and specifications
          </p>
        </div>

        {/* History Grid */}
        {historyItems.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-6">
                <ImageIcon className="h-20 w-20 text-[#C89F7A]" strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-semibold text-[#111111] mb-3">
                No history yet
              </h3>
              <p className="text-gray-600 text-center mb-8 max-w-lg leading-relaxed">
                Start by uploading an inspiration image or creating a specs-based search. Your projects will appear here.
              </p>
              <Button
                onClick={() => navigate('/upload')}
                className="bg-black text-white hover:bg-black/90 rounded-full px-8"
                size="lg"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {historyItems.map((item) => (
              <Card
                key={item.id}
                className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                onClick={() => handleItemClick(item)}
              >
                {item.type === 'inspiration' && item.image_url ? (
                  <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : item.type === 'specs' && item.category && CATEGORY_THUMBNAILS[item.category] ? (
                  <div className="aspect-[4/3] overflow-hidden bg-gray-100 relative">
                    <img
                      src={CATEGORY_THUMBNAILS[item.category]}
                      alt={CATEGORY_LABELS[item.category] || item.category}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-4">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                    <FileText className="h-16 w-16 text-purple-400" />
                  </div>
                )}
                
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge 
                      variant="outline" 
                      className={item.type === 'inspiration' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}
                    >
                      {item.type === 'inspiration' ? 'Inspiration' : 'Specs'}
                    </Badge>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-[#111111] line-clamp-2 mb-2">
                    {item.type === 'specs' && item.category 
                      ? CATEGORY_LABELS[item.category] || item.category
                      : item.title}
                  </h3>
                  
                  {item.type === 'specs' && item.search_queries && item.search_queries.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">Search strategies:</p>
                      <div className="space-y-1">
                        {item.search_queries.slice(0, 2).map((query, idx) => (
                          <p key={idx} className="text-xs font-mono text-gray-600 truncate bg-gray-50 px-2 py-1 rounded">
                            {query}
                          </p>
                        ))}
                        {item.search_queries.length > 2 && (
                          <p className="text-xs text-gray-500">+{item.search_queries.length - 2} more</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-500">
                    {formatDate(item.created_at)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}