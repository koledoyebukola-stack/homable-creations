import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { analyzeRoom, RoomAnalysis } from '@/lib/designSpace';
import { toast } from 'sonner';

export default function DesignSpaceAnalyze() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [analyzing, setAnalyzing] = useState(true);
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    performAnalysis();
  }, []);

  const performAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError(null);

      const template = searchParams.get('template');
      const unknownDimensions = searchParams.get('unknown_dimensions') === 'true';
      
      // Get files from sessionStorage if they were uploaded
      const filesData = sessionStorage.getItem('designSpaceFiles');
      let files: File[] | undefined;
      
      if (filesData) {
        // Files were uploaded - we'll need to reconstruct them
        // For now, we'll handle template-based analysis
        // File upload analysis will be implemented when user actually uploads files
        sessionStorage.removeItem('designSpaceFiles');
      }

      // Perform room analysis
      const result = await analyzeRoom(template || undefined, files, unknownDimensions);
      
      setAnalysis(result);
      setAnalyzing(false);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze room');
      setAnalyzing(false);
    }
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

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h1 className="text-4xl font-bold mb-4 text-[#111111]">
              Room Analysis Complete
            </h1>
            <p className="text-lg text-[#555555]">
              We've analyzed your space and identified key constraints
            </p>
          </div>

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-6 mb-12">
              {/* Room Type & Size */}
              <Card className="p-6">
                <h2 className="text-xl font-bold text-[#111111] mb-4">
                  Space Overview
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-[#555555] mb-1">Room Type</p>
                    <p className="text-lg font-semibold text-[#111111]">
                      {analysis.roomType}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#555555] mb-1">Size Class</p>
                    <p className="text-lg font-semibold text-[#111111] capitalize">
                      {analysis.sizeClass}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#555555] mb-1">Usable Area</p>
                    <p className="text-lg font-semibold text-[#111111]">
                      {analysis.usableArea}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#555555] mb-1">Confidence</p>
                    <p className="text-lg font-semibold text-[#111111] capitalize">
                      {analysis.confidence}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Structural Features */}
              <Card className="p-6">
                <h2 className="text-xl font-bold text-[#111111] mb-4">
                  Structural Features
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-[#555555] mb-1">Walls</p>
                    <p className="text-lg font-semibold text-[#111111]">
                      {analysis.walls}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#555555] mb-1">Doors</p>
                    <p className="text-lg font-semibold text-[#111111]">
                      {analysis.doors}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#555555] mb-1">Windows</p>
                    <p className="text-lg font-semibold text-[#111111]">
                      {analysis.windows}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Zones */}
              <Card className="p-6">
                <h2 className="text-xl font-bold text-[#111111] mb-4">
                  Space Constraints
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-[#555555] mb-2">Blocked Zones</p>
                    <ul className="space-y-1">
                      {analysis.blockedZones.map((zone, index) => (
                        <li key={index} className="text-[#111111] flex items-start gap-2">
                          <span className="text-red-500">•</span>
                          <span>{zone}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm text-[#555555] mb-2">Walkable Zones</p>
                    <ul className="space-y-1">
                      {analysis.walkableZones.map((zone, index) => (
                        <li key={index} className="text-[#111111] flex items-start gap-2">
                          <span className="text-green-500">•</span>
                          <span>{zone}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Confidence Note */}
              {analysis.confidence !== 'high' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900">
                      <span className="font-medium">Note:</span> Our analysis has {analysis.confidence} confidence. 
                      The design options we generate will be conservative to ensure they fit your space safely.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Continue Button */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={handleRetry}
              variant="outline"
              size="lg"
              className="px-8"
            >
              Start Over
            </Button>
            <Button
              onClick={handleContinue}
              size="lg"
              className="bg-[#111111] hover:bg-[#333333] text-white px-12"
            >
              See Design Options
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}