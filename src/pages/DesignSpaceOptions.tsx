import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, Sparkles, RefreshCw, ArrowLeft } from 'lucide-react';
import { 
  generateStyleDirections, 
  generateStyleInspirations,
  generateDeepDesign, 
  RoomAnalysis, 
  StyleDirection, 
  StyleInspiration,
  DesignOption, 
  DesignStyle 
} from '@/lib/designSpace';
import { toast } from 'sonner';

type ViewMode = 'directions' | 'inspirations' | 'deep-design';

export default function DesignSpaceOptions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('directions');
  const [loading, setLoading] = useState(true);
  const [inspirationsLoading, setInspirationsLoading] = useState(false);
  const [deepLoading, setDeepLoading] = useState(false);
  const [directions, setDirections] = useState<StyleDirection[]>([]);
  const [inspirations, setInspirations] = useState<StyleInspiration[]>([]);
  const [deepDesign, setDeepDesign] = useState<DesignOption | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<StyleDirection | null>(null);
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);
  const [generatedStyles, setGeneratedStyles] = useState<DesignStyle[]>([]);

  useEffect(() => {
    loadStyleDirections();
  }, []);

  // STEP A: Load 3-4 auto-selected style directions
  const loadStyleDirections = async (excludedStyles: DesignStyle[] = []) => {
    try {
      setLoading(true);
      
      const analysisData = location.state?.analysis as RoomAnalysis;
      if (!analysisData) {
        toast.error('No room analysis found. Please start over.');
        navigate('/upload?mode=design');
        return;
      }

      setAnalysis(analysisData);

      // Generate 3-4 style directions (lightweight)
      const generatedDirections = await generateStyleDirections(analysisData, excludedStyles);
      setDirections(generatedDirections);
      
      // Track generated styles
      const newStyles = generatedDirections.map(d => d.style);
      setGeneratedStyles(prev => [...prev, ...newStyles]);
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to generate style directions:', error);
      toast.error('Failed to generate style directions');
      setLoading(false);
    }
  };

  // STEP B: Handle direction selection
  const handleSelectDirection = (direction: StyleDirection) => {
    setSelectedDirection(direction);
  };

  // STEP C1: Generate 6 inspirations for selected style
  const handleExploreStyle = async () => {
    if (!selectedDirection || !analysis) return;

    try {
      setInspirationsLoading(true);
      
      // Generate 6 inspirations for selected style
      const generatedInspirations = await generateStyleInspirations(analysis, selectedDirection.style);
      setInspirations(generatedInspirations);
      setViewMode('inspirations');
      setInspirationsLoading(false);
    } catch (error) {
      console.error('Failed to generate inspirations:', error);
      toast.error('Failed to generate style inspirations');
      setInspirationsLoading(false);
    }
  };

  // STEP C2: Handle "Show me other directions" - generate 3 more styles
  const handleShowOtherDirections = async () => {
    setSelectedDirection(null);
    
    // Generate 3 more styles excluding already generated ones
    await loadStyleDirections(generatedStyles);
  };

  // Continue to deep design from inspirations
  const handleContinueToDeepDesign = async () => {
    if (!selectedDirection || !analysis) return;

    try {
      setDeepLoading(true);
      
      // Generate full-fidelity design for selected style
      const design = await generateDeepDesign(analysis, selectedDirection.style);
      setDeepDesign(design);
      setViewMode('deep-design');
      setDeepLoading(false);
    } catch (error) {
      console.error('Failed to generate deep design:', error);
      toast.error('Failed to generate detailed design');
      setDeepLoading(false);
    }
  };

  const handleContinueToItems = () => {
    if (!deepDesign || !analysis) return;

    navigate('/design-space/items', {
      state: { 
        analysis,
        selectedOption: deepDesign 
      }
    });
  };

  const handleBackToDirections = () => {
    setViewMode('directions');
    setDeepDesign(null);
    setInspirations([]);
    setSelectedDirection(null);
  };

  const handleBackToInspirations = () => {
    setViewMode('inspirations');
    setDeepDesign(null);
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Loading state for STEP A
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8">
              <div className="text-center">
                <Loader2 className="w-16 h-16 mx-auto text-[#111111] animate-spin mb-4" />
                <h2 className="text-2xl font-bold text-[#111111] mb-4">
                  {generatedStyles.length === 0 ? 'Analyzing Your Space' : 'Generating More Styles'}
                </h2>
                <p className="text-[#555555]">
                  {generatedStyles.length === 0 
                    ? `Auto-selecting design directions that make sense for your ${analysis?.roomType.toLowerCase()}...`
                    : 'Finding 3 more style directions for you...'
                  }
                </p>
              </div>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Loading state for STEP C1
  if (inspirationsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8">
              <div className="text-center">
                <Loader2 className="w-16 h-16 mx-auto text-[#111111] animate-spin mb-4" />
                <h2 className="text-2xl font-bold text-[#111111] mb-4">
                  Exploring {selectedDirection?.style}
                </h2>
                <p className="text-[#555555] mb-4">
                  Generating 6 inspirations with varied compositions, accessories, and moods...
                </p>
                <p className="text-xs text-[#777777]">
                  This may take 30-60 seconds
                </p>
              </div>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Loading state for STEP C2
  if (deepLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8">
              <div className="text-center">
                <Loader2 className="w-16 h-16 mx-auto text-[#111111] animate-spin mb-4" />
                <h2 className="text-2xl font-bold text-[#111111] mb-4">
                  Generating {selectedDirection?.style} Design
                </h2>
                <p className="text-[#555555] mb-4">
                  Creating complete design with furniture breakdown, color palettes, and cost estimates...
                </p>
                <p className="text-xs text-[#777777]">
                  This may take 30-60 seconds
                </p>
              </div>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // VIEW: Inspirations (STEP C1 result)
  if (viewMode === 'inspirations' && inspirations.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <Badge className="mb-4 bg-[#111111] text-white">
                {selectedDirection?.style}
              </Badge>
              <h1 className="text-4xl font-bold mb-4 text-[#111111]">
                {selectedDirection?.style} Inspirations
              </h1>
              <p className="text-lg text-[#555555] mb-2">
                6 variations within {selectedDirection?.style} aesthetic
              </p>
              <p className="text-sm text-[#777777]">
                All designs respect your room's layout and existing furniture
              </p>
            </div>

            {/* Inspirations Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {inspirations.map((inspiration) => (
                <Card
                  key={inspiration.id}
                  className="overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={inspiration.imageUrl}
                      alt={inspiration.description}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <Badge variant="outline" className="mb-2">
                      {inspiration.mood}
                    </Badge>
                    <p className="text-sm text-[#555555]">
                      {inspiration.description}
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Button
                onClick={handleBackToDirections}
                variant="outline"
                size="lg"
              >
                <ArrowLeft className="mr-2 w-5 h-5" />
                Back to Styles
              </Button>
              <Button
                onClick={handleContinueToDeepDesign}
                size="lg"
                className="bg-[#111111] hover:bg-[#333333] text-white"
              >
                Get Full Design Details
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // VIEW: Deep Design (STEP C2 result)
  if (viewMode === 'deep-design' && deepDesign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <Badge className="mb-4 bg-[#111111] text-white">
                {deepDesign.style}
              </Badge>
              <h1 className="text-4xl font-bold mb-4 text-[#111111]">
                Your {deepDesign.style} Design
              </h1>
              <p className="text-lg text-[#555555]">
                {deepDesign.description}
              </p>
            </div>

            {/* Design Preview */}
            <Card className="overflow-hidden mb-8">
              <div className="aspect-video bg-gray-100">
                <img
                  src={deepDesign.imageUrl}
                  alt={deepDesign.style}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 bg-white">
                <p className="text-sm text-[#555555] italic">
                  <strong>Layout Strategy:</strong> {deepDesign.layoutLogic}
                </p>
              </div>
            </Card>

            {/* Color Palettes */}
            <Card className="p-6 mb-8">
              <h3 className="text-lg font-bold text-[#111111] mb-4">
                Color Palettes
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                {deepDesign.colorPalettes.map((palette) => (
                  <div
                    key={palette.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      palette.id === deepDesign.selectedPaletteId
                        ? 'border-[#111111] bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex gap-2 mb-3">
                      {palette.colors.map((color, idx) => (
                        <div
                          key={idx}
                          className="w-12 h-12 rounded-lg border border-gray-300"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <p className="text-sm font-medium text-[#111111] mb-1">
                      {palette.name}
                    </p>
                    <p className="text-xs text-[#555555]">
                      {palette.description}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Cost Estimate */}
            <Card className="p-6 mb-8">
              <h3 className="text-lg font-bold text-[#111111] mb-4">
                Estimated Investment
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#111111]">
                  ${deepDesign.estimatedCostMin.toLocaleString()}
                </span>
                <span className="text-xl text-[#555555]">–</span>
                <span className="text-3xl font-bold text-[#111111]">
                  ${deepDesign.estimatedCostMax.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-[#555555] mt-2">
                Estimated range • {deepDesign.furnitureCount} items
              </p>
            </Card>

            {/* Item Breakdown */}
            <Card className="p-6 mb-8">
              <h3 className="text-lg font-bold text-[#111111] mb-4">
                Furniture & Decor Breakdown
              </h3>
              <div className="space-y-4">
                {deepDesign.items.map((item) => (
                  <div key={item.id} className="border-b pb-4 last:border-b-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#111111]">{item.name}</h4>
                        <p className="text-sm text-[#555555]">{item.role}</p>
                      </div>
                      <Badge variant="outline" className="ml-4">
                        {item.category}
                      </Badge>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-[#777777]">
                          <strong>Dimensions:</strong> {item.dimensions}
                        </p>
                        <p className="text-[#777777]">
                          <strong>Materials:</strong> {item.materials.join(', ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#777777]">
                          <strong>Placement:</strong> {item.placementIntent}
                        </p>
                        <p className="text-[#777777]">
                          <strong>Price:</strong> ${item.estimatedPriceMin}–${item.estimatedPriceMax}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-[#555555] italic mt-2">
                      {item.styleNotes}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Button
                onClick={handleBackToInspirations}
                variant="outline"
                size="lg"
                className="px-8"
              >
                <ArrowLeft className="mr-2 w-5 h-5" />
                Back to Inspirations
              </Button>
              <Button
                onClick={handleContinueToItems}
                size="lg"
                className="bg-[#111111] hover:bg-[#333333] text-white px-12"
              >
                Continue to Shopping
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // VIEW: Style Directions (STEP A result)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 text-[#111111]">
              Design Directions for Your Space
            </h1>
            <p className="text-lg text-[#555555] mb-2">
              We've selected {directions.length} styles that make sense for your {analysis?.roomType.toLowerCase()}
            </p>
            <p className="text-sm text-[#777777]">
              Based on your room's layout, existing furniture, and proportions
            </p>
          </div>

          {/* Source Image Preview */}
          {analysis?.sourceImageUrl && (
            <div className="mb-12">
              <Card className="overflow-hidden max-w-md mx-auto">
                <div className="aspect-[4/3] bg-gray-100">
                  <img
                    src={analysis.sourceImageUrl}
                    alt="Your room"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 bg-white text-center">
                  <p className="text-sm text-[#555555]">
                    Your Room
                  </p>
                  <p className="text-xs text-[#888888] mt-1">
                    {analysis.roomType} • {analysis.sizeClass} • {analysis.usableArea}
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Style Directions Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {directions.map((direction) => {
              const isSelected = selectedDirection?.id === direction.id;
              
              return (
                <Card
                  key={direction.id}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-xl overflow-hidden ${
                    isSelected
                      ? 'ring-2 ring-[#111111] shadow-xl'
                      : ''
                  }`}
                  onClick={() => handleSelectDirection(direction)}
                >
                  {/* Style Preview Image */}
                  <div className="relative h-64 bg-gray-100">
                    <img
                      src={direction.imageUrl}
                      alt={direction.name}
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                        <div className="bg-white rounded-full p-3">
                          <Sparkles className="w-6 h-6 text-[#111111]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-[#111111]">
                        {direction.style}
                      </h3>
                      <Badge 
                        variant="outline"
                        className={
                          direction.investmentLevel === 'low' 
                            ? 'border-green-500 text-green-700'
                            : direction.investmentLevel === 'medium'
                            ? 'border-yellow-500 text-yellow-700'
                            : 'border-red-500 text-red-700'
                        }
                      >
                        {direction.investmentLevel}
                      </Badge>
                    </div>
                    <p className="text-sm text-[#555555]">
                      {direction.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* STEP B: Intent Confirmation */}
          {selectedDirection && (
            <Card className="p-8 mb-8 bg-gray-50 border-2 border-[#111111]">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-[#111111] mb-4">
                  Explore {selectedDirection.style}?
                </h3>
                <p className="text-[#555555] mb-6">
                  We'll generate 6 inspirations showing varied compositions, accessories, and moods within this style.
                </p>
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={handleShowOtherDirections}
                    variant="outline"
                    size="lg"
                  >
                    <RefreshCw className="mr-2 w-5 h-5" />
                    Show Me Other Directions
                  </Button>
                  <Button
                    onClick={handleExploreStyle}
                    size="lg"
                    className="bg-[#111111] hover:bg-[#333333] text-white"
                  >
                    Explore This Style Further
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Back Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleBack}
              variant="outline"
              size="lg"
              className="px-8"
            >
              Back to Analysis
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}