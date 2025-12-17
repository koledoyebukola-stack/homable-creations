import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Search, Share2, CheckCircle2, TrendingDown, Maximize2, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  getAmazonSearchUrl, 
  getWalmartSearchUrl, 
  getWayfairSearchUrl, 
  getTemuSearchUrl, 
  getSheinSearchUrl,
  getGoogleSearchUrl 
} from '@/lib/retailer-utils';

interface SpecsData {
  category: string;
  data: Record<string, string | boolean>;
}

interface SearchOption {
  title: string;
  description: string;
  query: string;
  icon: typeof CheckCircle2;
}

const CATEGORY_LABELS: Record<string, string> = {
  'sofa': 'Sofa / Sectional',
  'dining-table': 'Dining Table',
  'rug': 'Rug',
  'bed': 'Bed Frame',
  'desk': 'Desk'
};

const FIELD_LABELS: Record<string, string> = {
  width: 'Max width',
  length: 'Max length',
  depth: 'Max depth',
  height: 'Max height',
  seating: 'Seating capacity',
  size: 'Size',
  shape: 'Shape',
  orientation: 'Orientation',
  fabric: 'Fabric',
  material: 'Material',
  color: 'Color',
  style: 'Style',
  easy_returns: 'Easy returns',
  lowest_price: 'Lowest price'
};

function generateSearchOptions(category: string, data: Record<string, string | boolean>): SearchOption[] {
  const baseTerms: string[] = [];
  
  // Build base query from required and optional fields
  if (category === 'sofa') {
    if (data.width) baseTerms.push(`${data.width} inch`);
    if (data.shape) baseTerms.push(data.shape as string);
    baseTerms.push('sectional sofa');
    if (data.seating) baseTerms.push(`${data.seating} seater`);
    if (data.fabric) baseTerms.push(data.fabric as string);
    if (data.color) baseTerms.push(data.color as string);
  } else if (category === 'dining-table') {
    if (data.length) baseTerms.push(`${data.length} inch`);
    if (data.shape) baseTerms.push(data.shape as string);
    baseTerms.push('dining table');
    if (data.seating) baseTerms.push(`${data.seating} seater`);
    if (data.material) baseTerms.push(data.material as string);
    if (data.color) baseTerms.push(data.color as string);
  } else if (category === 'rug') {
    if (data.width && data.length) baseTerms.push(`${data.width}x${data.length} ft`);
    if (data.shape) baseTerms.push(data.shape as string);
    baseTerms.push('rug');
    if (data.material) baseTerms.push(data.material as string);
    if (data.color) baseTerms.push(data.color as string);
  } else if (category === 'bed') {
    if (data.size) baseTerms.push(data.size as string);
    baseTerms.push('bed frame');
    if (data.style) baseTerms.push(data.style as string);
    if (data.material) baseTerms.push(data.material as string);
    if (data.color) baseTerms.push(data.color as string);
  } else if (category === 'desk') {
    if (data.width) baseTerms.push(`${data.width} inch`);
    if (data.style) baseTerms.push(data.style as string);
    baseTerms.push('desk');
    if (data.material) baseTerms.push(data.material as string);
    if (data.color) baseTerms.push(data.color as string);
  }

  // Add priority-based modifiers
  let baseQuery = baseTerms.join(' ');
  if (data.easy_returns) {
    baseQuery += ' easy returns';
  }
  if (data.lowest_price) {
    baseQuery += ' budget';
  }

  const options: SearchOption[] = [
    {
      title: 'Best match',
      description: 'Based on your size and specifications',
      query: baseQuery,
      icon: CheckCircle2
    }
  ];

  // Small-space variant
  const smallSpaceTerms = baseTerms.filter(term => 
    !term.includes('inch') && !term.includes('ft') && !term.includes('seater')
  );
  smallSpaceTerms.push('small space');
  let smallSpaceQuery = smallSpaceTerms.join(' ');
  if (data.easy_returns) smallSpaceQuery += ' easy returns';
  if (data.lowest_price) smallSpaceQuery += ' budget';
  
  options.push({
    title: 'Small-space option',
    description: 'Compact alternatives for tighter spaces',
    query: smallSpaceQuery,
    icon: Maximize2
  });

  // Budget variant
  const budgetTerms = baseTerms.filter(term => 
    !term.includes('inch') && !term.includes('ft')
  );
  budgetTerms.push('budget');
  let budgetQuery = budgetTerms.join(' ');
  if (data.easy_returns) budgetQuery += ' easy returns';
  
  options.push({
    title: 'Budget option',
    description: 'More affordable alternatives',
    query: budgetQuery,
    icon: TrendingDown
  });

  return options;
}

async function saveSpecsToHistory(category: string, data: Record<string, string | boolean>, queries: string[]) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('User not authenticated, skipping auto-save');
      return;
    }

    // Save to a specs_history table (you'll need to create this)
    const { error } = await supabase
      .from('app_8574c59127_specs_history')
      .insert({
        user_id: user.id,
        category,
        specifications: data,
        search_queries: queries,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to auto-save specs:', error);
    } else {
      console.log('Specs auto-saved to history');
    }
  } catch (error) {
    console.error('Auto-save error:', error);
  }
}

export default function SpecsResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [specsData, setSpecsData] = useState<SpecsData | null>(null);
  const [searchOptions, setSearchOptions] = useState<SearchOption[]>([]);

  useEffect(() => {
    const category = searchParams.get('category');
    const dataStr = searchParams.get('data');

    if (category && dataStr) {
      try {
        const data = JSON.parse(dataStr);
        setSpecsData({ category, data });
        
        // Generate search options
        const options = generateSearchOptions(category, data);
        setSearchOptions(options);

        // Auto-save to history
        const queries = options.map(opt => opt.query);
        saveSpecsToHistory(category, data, queries);
      } catch (error) {
        console.error('Failed to parse specs data:', error);
        navigate('/upload');
      }
    } else {
      navigate('/upload');
    }
  }, [searchParams, navigate]);

  if (!specsData) {
    return null;
  }

  const categoryLabel = CATEGORY_LABELS[specsData.category] || specsData.category;

  // Format specs for display
  const displaySpecs = Object.entries(specsData.data)
    .filter(([key, value]) => value && key !== 'easy_returns' && key !== 'lowest_price')
    .map(([key, value]) => ({
      label: FIELD_LABELS[key] || key,
      value: typeof value === 'boolean' ? 'Yes' : value
    }));

  const priorities = [];
  if (specsData.data.easy_returns) priorities.push('Easy returns');
  if (specsData.data.lowest_price) priorities.push('Lowest price');

  const handleEditSpecs = () => {
    navigate(`/specs/${specsData.category}?edit=true&data=${encodeURIComponent(JSON.stringify(specsData.data))}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => navigate('/upload')}
            variant="ghost"
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Start over
          </Button>

          {/* Summary Section */}
          <Card className="mb-12 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={handleEditSpecs}>
            <CardContent className="p-6 md:p-8">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-[#111111]">
                  Your {categoryLabel} Specifications
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditSpecs();
                  }}
                  className="flex-shrink-0"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displaySpecs.map((spec) => (
                  <div key={spec.label} className="flex items-center gap-2">
                    <span className="text-[#C89F7A]">•</span>
                    <span className="text-sm text-[#555555]">{spec.label}:</span>
                    <span className="text-sm font-semibold text-[#111111]">{spec.value}</span>
                  </div>
                ))}
              </div>

              {priorities.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-[#555555] mb-2">Priorities:</p>
                  <div className="flex flex-wrap gap-2">
                    {priorities.map((priority) => (
                      <Badge key={priority} variant="outline" className="bg-gray-50">
                        {priority}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search Options */}
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-[#111111] mb-2">
              Here's how to find the right match
            </h2>
            <p className="text-sm text-[#555555] mb-6">
              Each option below shows a tailored search query. Click a retailer to search directly.
            </p>

            <div className="space-y-6">
              {searchOptions.map((option, index) => {
                const Icon = option.icon;
                const isBestMatch = index === 0;
                return (
                  <Card 
                    key={index} 
                    className={`bg-white transition-all ${
                      isBestMatch 
                        ? 'border-2 border-[#C89F7A] shadow-md' 
                        : 'border border-gray-200 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`h-5 w-5 ${isBestMatch ? 'text-[#C89F7A]' : 'text-gray-400'}`} />
                          <h3 className="text-lg font-bold text-[#111111]">
                            {option.title}
                          </h3>
                        </div>
                        <p className="text-sm text-[#555555] mb-3">
                          {option.description}
                        </p>
                        <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                          <p className="text-sm font-mono text-[#111111] break-words">
                            {option.query}
                          </p>
                        </div>
                      </div>

                      {/* Retailer Buttons */}
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-[#555555] uppercase tracking-wide">
                          Search on:
                        </p>
                        
                        {/* Primary retailers: Amazon, Wayfair, Walmart */}
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full bg-white border border-[#FF9900] text-[#111111] hover:bg-[#FF9900]/10 font-medium"
                            onClick={() => window.open(getAmazonSearchUrl(option.query), '_blank')}
                          >
                            Amazon
                            <ExternalLink className="ml-1.5 h-3 w-3" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full bg-white border border-[#7B2CBF] text-[#111111] hover:bg-[#7B2CBF]/10 font-medium"
                            onClick={() => window.open(getWayfairSearchUrl(option.query), '_blank')}
                          >
                            Wayfair
                            <ExternalLink className="ml-1.5 h-3 w-3" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full bg-white border border-[#0071CE] text-[#111111] hover:bg-[#0071CE]/10 font-medium"
                            onClick={() => window.open(getWalmartSearchUrl(option.query), '_blank')}
                          >
                            Walmart
                            <ExternalLink className="ml-1.5 h-3 w-3" />
                          </Button>
                        </div>

                        {/* Secondary retailers: Temu & Shein */}
                        <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full bg-white border border-[#FF7A00] text-[#555555] hover:bg-[#FF7A00]/10"
                            onClick={() => window.open(getTemuSearchUrl(option.query), '_blank')}
                          >
                            Temu
                            <ExternalLink className="ml-1.5 h-3 w-3" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full bg-white border border-[#000000] text-[#555555] hover:bg-[#000000]/10"
                            onClick={() => window.open(getSheinSearchUrl(option.query), '_blank')}
                          >
                            Shein
                            <ExternalLink className="ml-1.5 h-3 w-3" />
                          </Button>
                        </div>

                        {/* Google Search Link */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-[#555555] hover:text-[#111111]"
                          onClick={() => window.open(getGoogleSearchUrl(option.query), '_blank')}
                        >
                          <Search className="mr-2 h-4 w-4" />
                          Search the web (Google)
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Save/Share Section */}
          <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-200">
            <CardContent className="p-6 md:p-8 text-center">
              <h3 className="text-xl md:text-2xl font-bold text-[#111111] mb-3">
                Share your plan
              </h3>
              <p className="text-sm md:text-base text-[#555555] mb-6">
                Your specifications have been automatically saved to your history
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  className="border-2 border-gray-300 text-[#555555] hover:bg-gray-50"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copied to clipboard!');
                  }}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}