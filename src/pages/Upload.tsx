import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ImageUploader from '@/components/ImageUploader';
import { Button } from '@/components/ui/button';
import { uploadImage, createBoard, validateDecorImage } from '@/lib/api';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

export default function Upload() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleImageSelect = (file: File) => {
    console.log('Image selected:', file.name, file.type, file.size);
    setSelectedFile(file);
    setValidationError(null);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setValidationError(null);
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
      
      // Create board with default name "Untitled inspiration"
      console.log('Creating board...');
      const board = await createBoard('Untitled inspiration', imageUrl);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-[#111111]">
              Upload an Inspiration Photo
            </h1>
            <p className="text-lg text-[#555555]">
              Recreate any space you love from Pinterest, Instagram, or your camera.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-lg">
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
        </div>
      </main>

      <Footer />
    </div>
  );
}