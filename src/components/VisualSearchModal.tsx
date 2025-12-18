import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Camera, ExternalLink, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface VisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  imageUrl: string;
  croppedImageUrl?: string;
}

export default function VisualSearchModal({
  isOpen,
  onClose,
  itemName,
  imageUrl,
  croppedImageUrl,
}: VisualSearchModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showNextStep, setShowNextStep] = useState(false);
  const isMobile = useIsMobile();
  const displayImage = croppedImageUrl || imageUrl;

  const handleContinueToVisualSearch = async () => {
    setIsProcessing(true);

    try {
      // Path A: Try mobile share sheet first (if supported)
      if (navigator.share && isMobile) {
        try {
          // Fetch the image as a blob
          const response = await fetch(displayImage);
          const blob = await response.blob();
          const file = new File([blob], `${itemName.replace(/\s+/g, '-')}.jpg`, { type: 'image/jpeg' });

          await navigator.share({
            title: `Find: ${itemName}`,
            text: `Search for this ${itemName} using visual search`,
            files: [file],
          });

          toast.success('Share sheet opened! Choose Google or Google Lens to search.');
          onClose();
          setIsProcessing(false);
          return;
        } catch (shareError) {
          console.log('Share API not supported or cancelled, falling back to Path B');
          // Fall through to Path B
        }
      }

      // Path B: Universal fallback - Download image and open Google Images
      // Create a temporary link to download the image
      const response = await fetch(displayImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${itemName.replace(/\s+/g, '-')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Show instruction toast
      toast.info('Image downloaded! Upload it to Google Images to find identical items.', {
        duration: 5000,
      });

      // Show next-step prompt inline
      setShowNextStep(true);
      setIsProcessing(false);
    } catch (error) {
      console.error('Failed to process visual search:', error);
      toast.error('Failed to prepare visual search. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleOpenGoogleImages = () => {
    window.open('https://images.google.com/', '_blank');
    onClose();
  };

  const content = (
    <div className="space-y-6">
      {/* Image Preview */}
      <div className="relative w-full max-w-md mx-auto">
        <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200">
          <img
            src={displayImage}
            alt={itemName}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Instructional Text */}
      <div className="text-center space-y-2">
        <p className="text-sm text-[#555555]">
          We'll use this image to help you find the same item on the web.
        </p>
        <p className="text-xs text-[#777777]">
          {isMobile 
            ? "You'll be able to choose Google Lens or your browser to search."
            : "The image will be downloaded, then you can upload it to Google Images."}
        </p>
      </div>

      {/* Primary CTA */}
      <Button
        onClick={handleContinueToVisualSearch}
        disabled={isProcessing || showNextStep}
        className="w-full bg-[#111111] hover:bg-[#333333] text-white rounded-full py-6 text-base font-semibold"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Upload className="mr-2 h-5 w-5 animate-pulse" />
            Preparing...
          </>
        ) : (
          <>
            <Camera className="mr-2 h-5 w-5" />
            Continue to visual search
          </>
        )}
      </Button>

      {/* Next-step Prompt (shown after download) */}
      {showNextStep && (
        <div className="space-y-3 p-4 bg-[#F5F5F5] rounded-xl border border-gray-200">
          <p className="text-sm font-bold text-[#111111]">
            Next step: search with the photo
          </p>
          
          <Button
            onClick={handleOpenGoogleImages}
            className="w-full bg-[#111111] hover:bg-[#333333] text-white rounded-full py-3 text-sm font-semibold"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Google Images
          </Button>
          
          <p className="text-xs text-[#777777] text-center">
            Upload the photo you just saved to find identical items.
          </p>
        </div>
      )}

      {/* Secondary Info */}
      {!showNextStep && (
        <p className="text-xs text-center text-[#999999]">
          This will open a new tab. No data is sent to Google by Homable.
        </p>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="px-4 pb-8">
          <DrawerHeader className="text-center">
            <DrawerTitle className="text-2xl font-bold text-[#111111]">
              Find exact match using a photo
            </DrawerTitle>
            <DrawerDescription className="text-[#555555]">
              Search for "{itemName}" with visual search
            </DrawerDescription>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#111111]">
            Find exact match using a photo
          </DialogTitle>
          <DialogDescription className="text-[#555555]">
            Search for "{itemName}" with visual search
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}