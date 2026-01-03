import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ExternalLink, Search } from 'lucide-react';
import { RoomAnalysis, DesignOption, DesignItem } from '@/lib/designSpace';
import { toast } from 'sonner';
import { 
  getAmazonSearchUrl, 
  getWalmartSearchUrl, 
  getWayfairSearchUrl, 
  getTemuSearchUrl, 
  getSheinSearchUrl,
  getGoogleSearchUrl 
} from '@/lib/retailer-utils';

// Helper function to handle async retailer button clicks
async function handleRetailerClick(getUrlFn: (query: string) => Promise<string>, query: string) {
  try {
    const url = await getUrlFn(query);
    window.open(url, '_blank');
  } catch (error) {
    console.error('Failed to generate retailer URL:', error);
    toast.error('Failed to open retailer link');
  }
}

export default function DesignSpaceItems() {
  const navigate = useNavigate();
  const location = useLocation();
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);
  const [selectedOption, setSelectedOption] = useState<DesignOption | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  useEffect(() => {
    // Get data from location state
    const analysisData = location.state?.analysis as RoomAnalysis;
    const optionData = location.state?.selectedOption as DesignOption;

    if (!analysisData || !optionData) {
      toast.error('Missing design data. Please start over.');
      navigate('/upload?mode=design');
      return;
    }

    setAnalysis(analysisData);
    setSelectedOption(optionData);
  }, [location.state, navigate]);

  const handleBack = () => {
    navigate(-1);
  };

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItemId(expandedItemId === itemId ? null : itemId);
  };

  // Generate rich search query for each item
  const generateSearchQuery = (item: DesignItem): string => {
    const parts = [
      item.name,
      item.sizeRange,
      item.materials[0]
    ];
    return parts.filter(Boolean).join(' ');
  };

  if (!analysis || !selectedOption) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="text-center">
            <p className="text-[#555555]">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Button
            onClick={handleBack}
            variant="ghost"
            className="mb-8 text-[#555555] hover:text-[#111111]"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Design Options
          </Button>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-[#111111]">
              {selectedOption.name} - Item Breakdown
            </h1>
            <p className="text-lg text-[#555555] mb-4">
              {selectedOption.furnitureCount} items • Estimated ${selectedOption.estimatedCost.toLocaleString()}
            </p>
            <Badge variant="outline" className="capitalize">
              {selectedOption.density} density
            </Badge>
          </div>

          {/* Image Preview Section */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Source Image */}
            {analysis.sourceImageUrl && (
              <Card className="overflow-hidden">
                <div className="aspect-[4/3] bg-gray-100">
                  <img
                    src={analysis.sourceImageUrl}
                    alt="Your room"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 bg-white text-center">
                  <p className="text-sm font-medium text-[#111111]">Your Space</p>
                  <p className="text-xs text-[#555555] mt-1">
                    {analysis.roomType} • {analysis.usableArea}
                  </p>
                </div>
              </Card>
            )}

            {/* Design Mockup */}
            <Card className="overflow-hidden">
              <div className="aspect-[4/3] bg-gray-100">
                <img
                  src={selectedOption.imageUrl}
                  alt={selectedOption.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 bg-white text-center">
                <p className="text-sm font-medium text-[#111111]">Selected Design</p>
                <p className="text-xs text-[#555555] mt-1">
                  {selectedOption.name}
                </p>
              </div>
            </Card>
          </div>

          {/* Layout Logic */}
          <Card className="p-6 mb-12 bg-blue-50 border-blue-200">
            <h2 className="text-lg font-bold text-[#111111] mb-2">
              Design Philosophy
            </h2>
            <p className="text-[#555555]">
              {selectedOption.layoutLogic}
            </p>
          </Card>

          {/* Item List */}
          <div className="space-y-4 mb-12">
            <h2 className="text-2xl font-bold text-[#111111] mb-6">
              Furniture & Decor Items
            </h2>
            
            {selectedOption.items.map((item) => {
              const isExpanded = expandedItemId === item.id;
              const searchQuery = generateSearchQuery(item);

              return (
                <Card key={item.id} className="overflow-hidden">
                  {/* Item Header - Always Visible */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-[#111111] mb-2">
                          {item.name}
                        </h3>
                        <Badge variant="outline" className="mb-3">
                          {item.role}
                        </Badge>
                        
                        {/* Rich Description */}
                        <div className="space-y-2 text-sm text-[#555555]">
                          <p>
                            <span className="font-medium text-[#111111]">Size:</span> {item.sizeRange}
                          </p>
                          <p>
                            <span className="font-medium text-[#111111]">Materials:</span> {item.materials.join(', ')}
                          </p>
                          <p>
                            <span className="font-medium text-[#111111]">Placement:</span> {item.placementIntent}
                          </p>
                          {item.estimatedPrice > 0 && (
                            <p>
                              <span className="font-medium text-[#111111]">Avg. Price:</span>{' '}
                              <span className="text-lg font-bold text-[#C89F7A]">
                                ${item.estimatedPrice.toLocaleString()}
                              </span>
                            </p>
                          )}
                        </div>

                        {/* Search Query Display */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs font-medium text-[#555555] mb-1">
                            Suggested Search:
                          </p>
                          <p className="text-sm font-mono text-[#111111]">
                            {searchQuery}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Find Products Button */}
                    <Button
                      onClick={() => toggleItemExpanded(item.id)}
                      className="w-full bg-[#111111] hover:bg-[#333333] text-white rounded-full"
                    >
                      {isExpanded ? 'Hide Retailers' : 'Find Products'}
                    </Button>
                  </div>

                  {/* Retailer Options - Shown when expanded */}
                  {isExpanded && (
                    <div className="px-6 pb-6">
                      <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-200">
                        <div className="p-6 space-y-4">
                          <p className="text-sm font-medium text-[#555555] text-center">
                            Search for "{item.name}" on:
                          </p>

                          {/* Primary Retailer Buttons */}
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              onClick={() => handleRetailerClick(getAmazonSearchUrl, searchQuery)}
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white border border-[#FF9900] text-[#111111] hover:bg-[#FF9900]/10 font-medium"
                            >
                              Amazon
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>

                            <Button
                              onClick={() => handleRetailerClick(getWayfairSearchUrl, searchQuery)}
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white border border-[#7B2CBF] text-[#111111] hover:bg-[#7B2CBF]/10 font-medium"
                            >
                              Wayfair
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>

                            <Button
                              onClick={() => handleRetailerClick(getWalmartSearchUrl, searchQuery)}
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white border border-[#0071CE] text-[#111111] hover:bg-[#0071CE]/10 font-medium"
                            >
                              Walmart
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>
                          </div>

                          {/* Secondary Buttons */}
                          <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                            <Button
                              onClick={() => handleRetailerClick(getTemuSearchUrl, searchQuery)}
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white border border-[#FF7A00] text-[#555555] hover:bg-[#FF7A00]/10"
                            >
                              Temu
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>

                            <Button
                              onClick={() => handleRetailerClick(getSheinSearchUrl, searchQuery)}
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white border border-[#000000] text-[#555555] hover:bg-[#000000]/10"
                            >
                              Shein
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>
                          </div>

                          {/* Google Search */}
                          <Button
                            onClick={() => window.open(getGoogleSearchUrl(searchQuery), '_blank')}
                            variant="outline"
                            size="sm"
                            className="w-full bg-gray-50 hover:bg-gray-100 text-[#111111] border-gray-200 font-medium"
                          >
                            <Search className="mr-2 h-4 w-4" />
                            Search the web (Google)
                          </Button>
                        </div>
                      </Card>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Summary Card */}
          <Card className="p-6 bg-gradient-to-br from-stone-50 to-gray-50">
            <h2 className="text-xl font-bold text-[#111111] mb-4">
              Shopping Summary
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-[#555555] mb-1">Total Items</p>
                <p className="text-2xl font-bold text-[#111111]">
                  {selectedOption.furnitureCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#555555] mb-1">Estimated Total</p>
                <p className="text-2xl font-bold text-[#C89F7A]">
                  ${selectedOption.estimatedCost.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#555555] mb-1">Density Level</p>
                <p className="text-2xl font-bold text-[#111111] capitalize">
                  {selectedOption.density}
                </p>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-12">
            <Button
              onClick={handleBack}
              variant="outline"
              size="lg"
              className="px-8"
            >
              Try Different Design
            </Button>
            <Button
              onClick={() => navigate('/upload?mode=design')}
              size="lg"
              className="bg-[#111111] hover:bg-[#333333] text-white px-12"
            >
              Start New Project
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}