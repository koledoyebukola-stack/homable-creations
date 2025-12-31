import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ImageUploader from '@/components/ImageUploader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { uploadImage, createBoard, validateDecorImage } from '@/lib/api';
import { toast } from 'sonner';
import { AlertCircle, Info } from 'lucide-react';
import SpecsCategorySelection from '@/components/specs/SpecsCategorySelection';
import { trackPageView, trackAction, EVENTS } from '@/lib/analytics';

// Sample images organized by category
const SAMPLE_CATEGORIES = [
  {
    id: 'afro-modern',
    title: 'Afro-Modern Style',
    description: 'African-inspired modern interiors',
    images: [
      { url: '/assets/sample-afro-modern-living-1.jpg', alt: 'Afro-modern living room' },
      { url: '/assets/sample-afro-modern-bedroom-2.jpg', alt: 'Afro-modern bedroom' },
      { url: '/assets/sample-afro-modern-dining-3.jpg', alt: 'Afro-modern dining room' },
    ]
  },
  {
    id: 'everyday-home',
    title: 'Everyday Home Styling',
    description: 'Living rooms, bedrooms, and more',
    images: [
      { url: '/assets/carousel-everyday-living-4.jpg', alt: 'Everyday living room' },
      { url: '/assets/carousel-everyday-bedroom-5.jpg', alt: 'Everyday bedroom' },
      { url: '/assets/carousel-everyday-kitchen-6.jpg', alt: 'Everyday kitchen' },
    ]
  },
  {
    id: 'holiday-looks',
    title: 'Holiday Looks',
    description: 'Christmas decor and seasonal styling',
    images: [
      { url: '/assets/carousel-holiday-living-1.jpg', alt: 'Holiday living room' },
      { url: '/assets/carousel-holiday-dining-2.jpg', alt: 'Holiday dining room' },
      { url: '/assets/carousel-holiday-entryway-3.jpg', alt: 'Holiday entryway' },
    ]
  },
  {
    id: 'events',
    title: 'Events',
    description: 'Special occasions and celebrations',
    images: [
      { url: '/assets/event-proposal.jpg', alt: 'Proposal event' },
      { url: '/assets/event-first-birthday.jpg', alt: 'First birthday' },
      { url: '/assets/event-vow-renewal.jpg', alt: 'Vow renewal' },
    ]
  }
];

type TabType = 'design' | 'inspiration' | 'specs';

export default function Upload() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSampleImage, setIsSampleImage] = useState(false);
  const [sampleImageAlt, setSampleImageAlt] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('inspiration');

  // Track homepage view on mount
  useEffect(() => {
    trackPageView(EVENTS.HOMEPAGE_VIEWED);
  }, []);

  // Read tab from URL query parameter on mount
  useEffect(() => {
    const mode = searchParams.get('mode');
    
    // Map mode parameter to tab
    if (mode === 'design') {
      setActiveTab('design');
    } else if (mode === 'replicate' || mode === 'inspiration') {
      setActiveTab('inspiration');
    } else if (mode === 'find') {
      setActiveTab('specs');
    }
  }, [searchParams]);

  const handleImageSelect = (file: File) => {
    console.log('Image selected:', file.name, file.type, file.size);
    setSelectedFile(file);
    setValidationError(null);
    setIsSampleImage(false);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Track upload started
    trackAction(EVENTS.UPLOAD_STARTED, { 
      file_size: file.size,
      file_type: file.type 
    });
  };

  const handleClear = () => {
    setSelectedFile(null);
    setValidationError(null);
    setIsSampleImage(false);
    setSampleImageAlt('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  };

  const handleTryAgain = () => {
    handleClear();
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error('Please select an image first');
      return;
    }

    console.log('Starting upload process for:', selectedFile.name);
    setUploading(true);
    setValidationError(null);

    // Track image analysis started
    trackAction(EVENTS.IMAGE_ANALYSIS_STARTED, {
      is_sample_image: isSampleImage
    });

    try {
      // Upload image to Supabase storage
      console.log('Uploading image to Supabase storage...');
      const imageUrl = await uploadImage(selectedFile);
      console.log('Image uploaded successfully:', imageUrl);
      
      // Validate that the image contains decor/furniture
      // If validation fails (network error, CORS, etc.), treat as valid and continue
      let validation;
      try {
        console.log('Validating image content...');
        validation = await validateDecorImage(imageUrl);
        console.log('Validation result:', validation);
      } catch (validationError) {
        console.error('Validation error (treating as valid):', validationError);
        // Log to help debug but don't block the user
        console.log('Validation failed, allowing image to proceed to analysis');
        validation = { is_valid: true, confidence: 0.5, reason: 'Validation error, allowing by default' };
      }
      
      // Check if image is valid (very permissive - only block if explicitly invalid)
      if (validation.is_valid === false) {
        setValidationError(
          "We couldn't detect decor in this image. Please upload a photo that clearly shows interior decor, furniture or home styling."
        );
        setUploading(false);
        return;
      }
      
      // Create board with appropriate name
      const boardName = isSampleImage ? sampleImageAlt : 'Untitled inspiration';
      console.log('Creating board...');
      const board = await createBoard(boardName, imageUrl);
      console.log('Board created successfully:', board.id);
      
      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      // Navigate to analyzing page
      console.log('Navigating to analyzing page...');
      navigate(`/analyzing/${board.id}`);
    } catch (error) {
      console.error('Upload error details:', error);
      
      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Upload failed: ${errorMessage}`);
      setUploading(false);
    }
  };

  const handleSampleImageClick = async (imageUrl: string, altText: string) => {
    console.log('Sample image clicked:', imageUrl);
    
    // Track upload clicked
    trackAction(EVENTS.UPLOAD_CLICKED, {
      source: 'sample_image',
      image_alt: altText
    });

    try {
      // Fetch the sample image and convert to blob
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Failed to load sample image');
      }
      const blob = await response.blob();
      
      // Create a File object from the blob
      const file = new File([blob], `sample-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Set as selected file and show in preview box
      setSelectedFile(file);
      setIsSampleImage(true);
      setSampleImageAlt(altText);
      setPreviewUrl(imageUrl); // Use the sample image URL directly for preview
      setValidationError(null);
      
      // Scroll to the preview box
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      console.log('Sample image loaded into preview box');
    } catch (error) {
      console.error('Sample image error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load sample image';
      toast.error(errorMessage);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Update URL without full navigation
    const newSearchParams = new URLSearchParams(searchParams);
    if (tab === 'design') {
      newSearchParams.set('mode', 'design');
    } else if (tab === 'inspiration') {
      newSearchParams.set('mode', 'inspiration');
    } else if (tab === 'specs') {
      newSearchParams.set('mode', 'find');
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${newSearchParams}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Static Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 text-[#111111]">
              Bring Your Design Ideas to Life
            </h1>
            <p className="text-lg text-[#555555]">
              Start from inspiration or from real-world constraints. Homable helps you turn ideas into an actionable plan.
            </p>
          </div>

          {/* Three-Tab Selector */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-white rounded-full p-1 shadow-md border border-gray-200">
              <button
                onClick={() => handleTabChange('design')}
                className={`px-6 py-2 md:py-3 rounded-full text-sm font-medium transition-all ${
                  activeTab === 'design'
                    ? 'bg-[#111111] text-white'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Design my space
              </button>
              <button
                onClick={() => handleTabChange('inspiration')}
                className={`px-6 py-2 md:py-3 rounded-full text-sm font-medium transition-all ${
                  activeTab === 'inspiration'
                    ? 'bg-[#111111] text-white'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Start with inspiration
              </button>
              <button
                onClick={() => handleTabChange('specs')}
                className={`px-6 py-2 md:py-3 rounded-full text-sm font-medium transition-all ${
                  activeTab === 'specs'
                    ? 'bg-[#111111] text-white'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Start with what fits
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {/* Design My Space Tab - Placeholder */}
          {activeTab === 'design' && (
            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-[#111111] mb-4">
                  Design My Space
                </h2>
                <p className="text-[#555555] mb-8">
                  This feature is coming soon. Upload a photo of your empty room and we'll help you design it.
                </p>
                <Button
                  onClick={() => handleTabChange('inspiration')}
                  className="bg-[#111111] hover:bg-[#333333] text-white"
                >
                  Try Start with Inspiration Instead
                </Button>
              </div>
            </div>
          )}

          {/* Start with Inspiration Tab - PRESERVED EXISTING FLOW */}
          {activeTab === 'inspiration' && (
            <>
              <div className="bg-white rounded-3xl p-8 shadow-lg">
                {/* Info Banner - Positioned above the upload box */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900">
                      <span className="font-medium">Homable works best with home and event decor photos.</span> Non-decor images may not be analyzed.
                    </p>
                  </div>
                </div>

                <ImageUploader 
                  onImageSelect={handleImageSelect}
                  previewUrl={previewUrl}
                  onClear={handleClear}
                />

                {validationError && (
                  <div className="mt-6 p-6 bg-amber-50 border border-amber-200 rounded-2xl">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900 mb-2">
                          {validationError}
                        </p>
                        <p className="text-xs text-amber-700">
                          Try uploading a photo that shows furniture, a room, or home decor items.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleTryAgain}
                      variant="outline"
                      className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      Try Another Inspiration Photo
                    </Button>
                  </div>
                )}

                {selectedFile && !validationError && (
                  <div className="mt-8">
                    <Button
                      size="lg"
                      onClick={handleAnalyze}
                      disabled={uploading}
                      className="w-full bg-[#111111] hover:bg-[#333333] text-white text-lg py-6 rounded-full"
                    >
                      {uploading ? 'Validating...' : 'Analyze My Inspiration'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Sample Images Section */}
              <div className="mt-16">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-3 text-[#111111]">
                    Don't Have a Photo? Try One of Our Favourites!
                  </h2>
                  <p className="text-base text-[#555555]">
                    Choose one of these looks to see how Homable works.
                  </p>
                </div>

                {/* Categories */}
                <div className="space-y-12">
                  {SAMPLE_CATEGORIES.map((category) => (
                    <div key={category.id}>
                      <div className="mb-4">
                        <h3 className="text-xl font-semibold text-[#111111] mb-1">
                          {category.title}
                        </h3>
                        <p className="text-sm text-[#555555]">
                          {category.description}
                        </p>
                      </div>
                      
                      {/* Responsive Grid: 2 cols mobile, 3 cols tablet/desktop */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {category.images.map((image, index) => (
                          <Card
                            key={index}
                            className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl border-0"
                            onClick={() => !uploading && handleSampleImageClick(image.url, image.alt)}
                          >
                            <div className="aspect-[4/3] overflow-hidden">
                              <img
                                src={image.url}
                                alt={image.alt}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Start with Specs Tab - PRESERVED EXISTING FLOW */}
          {activeTab === 'specs' && (
            <SpecsCategorySelection />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}