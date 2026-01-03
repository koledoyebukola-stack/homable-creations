import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertCircle, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeRoom, RoomAnalysis } from '@/lib/designSpace';
import { toast } from 'sonner';

export default function DesignSpaceAnalyze() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [analyzing, setAnalyzing] = useState(true);
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showStructuralDetails, setShowStructuralDetails] = useState(false);
  
  // Dimension modal state
  const [showDimensionModal, setShowDimensionModal] = useState(false);
  const [dimensions, setDimensions] = useState({
    length: '',
    width: '',
    ceilingHeight: ''
  });
  const [dimensionErrors, setDimensionErrors] = useState({
    length: '',
    width: '',
    ceilingHeight: ''
  });
  const [userProvidedDimensions, setUserProvidedDimensions] = useState(false);

  useEffect(() => {
    performAnalysis();
  }, []);

  const performAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError(null);

      const template = searchParams.get('template');
      const uploadedImage = searchParams.get('uploaded_image');
      const unknownDimensions = searchParams.get('unknown_dimensions') === 'true';
      const length = searchParams.get('length');
      const width = searchParams.get('width');
      const ceilingHeight = searchParams.get('ceiling_height');

      // Check if user provided dimensions
      if (length && width && ceilingHeight) {
        setUserProvidedDimensions(true);
        setDimensions({
          length,
          width,
          ceilingHeight
        });
      }

      // Perform room analysis
      let result: RoomAnalysis;
      
      if (uploadedImage) {
        // User uploaded an image - analyze with Vision API
        result = await analyzeRoom(undefined, undefined, unknownDimensions, uploadedImage);
      } else if (template) {
        // User selected a template
        result = await analyzeRoom(template, undefined, unknownDimensions);
      } else {
        throw new Error('Either template or uploaded image must be provided');
      }
      
      setAnalysis(result);
      setAnalyzing(false);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze room');
      setAnalyzing(false);
    }
  };

  const validateDimension = (value: string, min: number, max: number, name: string): string => {
    if (!value) return `${name} is required`;
    const num = parseFloat(value);
    if (isNaN(num)) return `${name} must be a number`;
    if (num < min || num > max) return `${name} must be between ${min} and ${max} feet`;
    return '';
  };

  const handleDimensionSave = () => {
    const errors = {
      length: validateDimension(dimensions.length, 5, 50, 'Length'),
      width: validateDimension(dimensions.width, 5, 50, 'Width'),
      ceilingHeight: validateDimension(dimensions.ceilingHeight, 7, 20, 'Ceiling height')
    };

    setDimensionErrors(errors);

    if (errors.length || errors.width || errors.ceilingHeight) {
      return;
    }

    setUserProvidedDimensions(true);
    setShowDimensionModal(false);
    toast.success('Dimensions updated');
  };

  const handleContinue = () => {
    if (!analysis) return;

    // Navigate to design options page with analysis data
    navigate('/design-space/options', {
      state: { analysis }
    });
  };

  const handleRetry = () => {
    navigate('/upload?mode=design');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-[#111111] mb-4">
                  Analysis Failed
                </h2>
                <p className="text-[#555555] mb-8">
                  {error}
                </p>
                <Button
                  onClick={handleRetry}
                  className="bg-[#111111] hover:bg-[#333333] text-white"
                >
                  Try Again
                </Button>
              </div>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8">
              <div className="text-center">
                <Loader2 className="w-16 h-16 mx-auto text-[#111111] animate-spin mb-4" />
                <h2 className="text-2xl font-bold text-[#111111] mb-4">
                  Analyzing Your Space
                </h2>
                <p className="text-[#555555]">
                  Our AI is examining your room to understand its layout, dimensions, and constraints...
                </p>
              </div>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <h1 className="text-3xl font-bold mb-2 text-[#111111]">
              Planning Summary
            </h1>
            <p className="text-base text-[#555555]">
              Here's what we know about your space to help plan your design
            </p>
          </div>

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-4 mb-8">
              {/* GROUP 1: INPUTS */}
              <div className="space-y-3">
                {/* Source Image Preview */}
                {analysis.sourceImageUrl && (
                  <Card className="overflow-hidden">
                    <div className="aspect-[4/3] bg-gray-100">
                      <img
                        src={analysis.sourceImageUrl}
                        alt="Your room"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="py-2 px-4 bg-white text-center">
                      <p className="text-xs text-[#555555]">
                        {analysis.sourceImageUrl.includes('template') ? 'Selected Template' : 'Your Uploaded Image'}
                      </p>
                    </div>
                  </Card>
                )}

                {/* Dimensions Section */}
                <Card className="py-4 px-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-[#111111]">
                        {userProvidedDimensions ? 'Room Dimensions' : 'Estimated Room Dimensions'}
                      </h2>
                      <p className="text-xs text-[#555555] mt-0.5">
                        {userProvidedDimensions ? 'Provided by you' : 'AI estimate • You can edit these for better accuracy'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDimensionModal(true)}
                      className="flex items-center gap-1.5 text-xs h-8"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-[#555555] mb-0.5">Length</p>
                      <p className="text-base font-semibold text-[#111111]">
                        {userProvidedDimensions ? '' : '~'}{dimensions.length || '12'} ft
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#555555] mb-0.5">Width</p>
                      <p className="text-base font-semibold text-[#111111]">
                        {userProvidedDimensions ? '' : '~'}{dimensions.width || '10'} ft
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#555555] mb-0.5">Ceiling Height</p>
                      <p className="text-base font-semibold text-[#111111]">
                        {userProvidedDimensions ? '' : '~'}{dimensions.ceilingHeight || '9'} ft
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* GROUP 2: SPACE UNDERSTANDING */}
              <div className="space-y-3">
                {/* Space Overview */}
                <Card className="py-4 px-5">
                  <h2 className="text-lg font-bold text-[#111111] mb-3">
                    Space Overview
                  </h2>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <p className="text-xs text-[#555555] mb-0.5">Room Type</p>
                      <p className="text-base font-semibold text-[#111111]">
                        {analysis.roomType}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#555555] mb-0.5">Size Class</p>
                      <p className="text-base font-semibold text-[#111111] capitalize">
                        {analysis.sizeClass}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#555555] mb-0.5">Usable Area</p>
                      <p className="text-base font-semibold text-[#111111]">
                        {analysis.usableArea}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#555555] mb-0.5">Data Confidence</p>
                      <p className="text-base font-semibold text-[#111111] capitalize">
                        {analysis.confidence}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Structural Features - Collapsible */}
                <Card className="py-3 px-5">
                  <button
                    onClick={() => setShowStructuralDetails(!showStructuralDetails)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div>
                      <h2 className="text-base font-bold text-[#111111]">
                        Structural Features
                      </h2>
                      <p className="text-xs text-[#555555] mt-0.5">
                        Based on visible parts of the image, these features help us estimate layout constraints.
                      </p>
                    </div>
                    {showStructuralDetails ? (
                      <ChevronUp className="h-5 w-5 text-[#555555] flex-shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-[#555555] flex-shrink-0 ml-2" />
                    )}
                  </button>
                  {showStructuralDetails && (
                    <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                      <div>
                        <p className="text-xs text-[#555555] mb-0.5">Walls</p>
                        <p className="text-base font-semibold text-[#111111]">
                          {analysis.walls}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#555555] mb-0.5">Doors</p>
                        <p className="text-base font-semibold text-[#111111]">
                          {analysis.doors}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#555555] mb-0.5">Windows</p>
                        <p className="text-base font-semibold text-[#111111]">
                          {analysis.windows}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* GROUP 3: IMPLICATIONS */}
              <div className="space-y-3">
                {/* Space Constraints - Emphasized */}
                <Card className="py-4 px-5 border-2 border-[#111111]">
                  <h2 className="text-lg font-bold text-[#111111] mb-3">
                    Space Constraints
                  </h2>
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <p className="text-xs text-[#555555] mb-1 font-medium">Blocked Zones</p>
                      <p className="text-[10px] text-[#777777] mb-2">Areas where furniture placement is restricted</p>
                      <ul className="space-y-0.5">
                        {analysis.blockedZones.map((zone, index) => (
                          <li key={index} className="text-sm text-[#111111] flex items-start gap-1.5">
                            <span className="text-red-500 font-bold text-xs">•</span>
                            <span>{zone}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs text-[#555555] mb-1 font-medium">Walkable Zones</p>
                      <p className="text-[10px] text-[#777777] mb-2">Open areas available for circulation</p>
                      <ul className="space-y-0.5">
                        {analysis.walkableZones.map((zone, index) => (
                          <li key={index} className="text-sm text-[#111111] flex items-start gap-1.5">
                            <span className="text-green-500 font-bold text-xs">•</span>
                            <span>{zone}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>

                {/* Confidence Note */}
                {analysis.confidence !== 'high' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl py-3 px-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-900">
                        <span className="font-medium">Note:</span> Our analysis has {analysis.confidence} confidence based on your image. 
                        The design options we generate will be conservative to ensure they work well in your space.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Continue Button */}
          <div className="flex justify-center gap-3">
            <Button
              onClick={handleRetry}
              variant="outline"
              size="lg"
              className="px-6"
            >
              Start Over
            </Button>
            <Button
              onClick={handleContinue}
              size="lg"
              className="bg-[#111111] hover:bg-[#333333] text-white px-10"
            >
              See Design Options
            </Button>
          </div>
        </div>
      </main>

      {/* Dimension Edit Modal */}
      <Dialog open={showDimensionModal} onOpenChange={setShowDimensionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Room Dimensions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="length">Room Length (feet)</Label>
              <Input
                id="length"
                type="number"
                step="0.1"
                min="5"
                max="50"
                value={dimensions.length}
                onChange={(e) => {
                  setDimensions({ ...dimensions, length: e.target.value });
                  setDimensionErrors({ ...dimensionErrors, length: '' });
                }}
                className={dimensionErrors.length ? 'border-red-500' : ''}
              />
              {dimensionErrors.length && (
                <p className="text-sm text-red-500">{dimensionErrors.length}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="width">Room Width (feet)</Label>
              <Input
                id="width"
                type="number"
                step="0.1"
                min="5"
                max="50"
                value={dimensions.width}
                onChange={(e) => {
                  setDimensions({ ...dimensions, width: e.target.value });
                  setDimensionErrors({ ...dimensionErrors, width: '' });
                }}
                className={dimensionErrors.width ? 'border-red-500' : ''}
              />
              {dimensionErrors.width && (
                <p className="text-sm text-red-500">{dimensionErrors.width}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ceilingHeight">Ceiling Height (feet)</Label>
              <Input
                id="ceilingHeight"
                type="number"
                step="0.1"
                min="7"
                max="20"
                value={dimensions.ceilingHeight}
                onChange={(e) => {
                  setDimensions({ ...dimensions, ceilingHeight: e.target.value });
                  setDimensionErrors({ ...dimensionErrors, ceilingHeight: '' });
                }}
                className={dimensionErrors.ceilingHeight ? 'border-red-500' : ''}
              />
              {dimensionErrors.ceilingHeight && (
                <p className="text-sm text-red-500">{dimensionErrors.ceilingHeight}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDimensionModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDimensionSave}
                className="bg-[#111111] hover:bg-[#333333] text-white"
              >
                Save Dimensions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}