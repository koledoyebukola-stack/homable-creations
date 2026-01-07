import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { DetectedItem } from '@/lib/types';
import { toast } from 'sonner';

interface VendorShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DetectedItem;
  inspirationImageUrl: string;
}

interface DimensionsObject {
  width?: string;
  depth?: string;
  length?: string;
  height?: string;
  diameter?: string;
}

export default function VendorShareModal({ isOpen, onClose, item, inspirationImageUrl }: VendorShareModalProps) {
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasGeneratedRef = useRef(false);

  // Helper function to format dimensions for display
  const formatDimensions = (item: DetectedItem): string | null => {
    // If dimensions is a string (from database), use it directly
    if (typeof item.dimensions === 'string') {
      return item.dimensions;
    }
    
    // If dimensions is an object, format it
    if (item.dimensions && typeof item.dimensions === 'object') {
      const dims = item.dimensions as DimensionsObject;
      const parts: string[] = [];
      
      if (dims.width) parts.push(`W: ${dims.width}`);
      if (dims.depth || dims.length) parts.push(`D: ${dims.depth || dims.length}`);
      if (dims.height) parts.push(`H: ${dims.height}`);
      if (dims.diameter) parts.push(`Ø: ${dims.diameter}`);
      
      return parts.length > 0 ? parts.join(' × ') : null;
    }
    
    return null;
  };

  const generateVendorImage = useCallback(async () => {
    console.log('[VendorShareModal] Starting image generation...');
    setGeneratingImage(true);
    
    try {
      // Wait a bit for canvas to mount if needed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error('[VendorShareModal] Canvas ref is null - canvas not mounted yet');
        setGeneratingImage(false);
        toast.error('Canvas not ready. Please try again.');
        return;
      }
      console.log('[VendorShareModal] Canvas element found:', canvas);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('[VendorShareModal] Failed to get 2D context from canvas');
        setGeneratingImage(false);
        toast.error('Failed to initialize canvas context');
        return;
      }
      console.log('[VendorShareModal] Canvas 2D context obtained');

      // Set canvas to square 1:1 ratio (1200x1200 for high quality)
      const size = 1200;
      canvas.width = size;
      canvas.height = size;
      console.log('[VendorShareModal] Canvas dimensions set to', size, 'x', size);

      // Fill white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
      console.log('[VendorShareModal] White background filled');

      // Load inspiration image
      console.log('[VendorShareModal] Loading inspiration image from:', inspirationImageUrl);
      const inspirationImg = new Image();
      // Only set crossOrigin for external URLs
      if (inspirationImageUrl.startsWith('http://') || inspirationImageUrl.startsWith('https://')) {
        inspirationImg.crossOrigin = 'anonymous';
      }
      
      await new Promise((resolve, reject) => {
        inspirationImg.onload = () => {
          console.log('[VendorShareModal] Inspiration image loaded successfully');
          console.log('[VendorShareModal] Image dimensions:', inspirationImg.width, 'x', inspirationImg.height);
          resolve(null);
        };
        inspirationImg.onerror = (error) => {
          console.error('[VendorShareModal] Failed to load inspiration image:', error);
          console.error('[VendorShareModal] Image URL:', inspirationImageUrl);
          reject(new Error('Failed to load inspiration image'));
        };
        inspirationImg.src = inspirationImageUrl;
      });

      // Primary hero image takes top 60% of canvas (720px)
      const heroHeight = size * 0.60;
      const heroWidth = size;
      
      // Use center crop with 1:1 aspect ratio for hero image
      const minDim = Math.min(inspirationImg.width, inspirationImg.height);
      const cropRegion = {
        x: Math.round((inspirationImg.width - minDim) / 2),
        y: Math.round((inspirationImg.height - minDim) / 2),
        width: minDim,
        height: minDim
      };
      
      console.log('[VendorShareModal] Center crop region:', cropRegion);

      // Draw the cropped hero image (square, top 60%)
      ctx.drawImage(
        inspirationImg,
        cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height,
        0, 0, heroWidth, heroHeight
      );
      
      console.log('[VendorShareModal] Hero image drawn');

      // Content area starts at 60% (720px from top)
      const contentY = heroHeight + 40;
      const contentPadding = 60;

      // Draw secondary thumbnail (bottom right, "Seen in this room")
      const thumbnailSize = 280;
      const thumbnailX = size - thumbnailSize - contentPadding;
      const thumbnailY = contentY + 20;
      
      // Calculate thumbnail crop (center of full image)
      const thumbAspect = inspirationImg.width / inspirationImg.height;
      let thumbCropW, thumbCropH, thumbCropX, thumbCropY;
      
      if (thumbAspect > 1) {
        thumbCropH = inspirationImg.height;
        thumbCropW = thumbCropH;
        thumbCropX = (inspirationImg.width - thumbCropW) / 2;
        thumbCropY = 0;
      } else {
        thumbCropW = inspirationImg.width;
        thumbCropH = thumbCropW;
        thumbCropX = 0;
        thumbCropY = (inspirationImg.height - thumbCropH) / 2;
      }
      
      // Draw thumbnail with border
      ctx.strokeStyle = '#E5E5E5';
      ctx.lineWidth = 2;
      ctx.strokeRect(thumbnailX, thumbnailY, thumbnailSize, thumbnailSize);
      
      ctx.drawImage(
        inspirationImg,
        thumbCropX, thumbCropY, thumbCropW, thumbCropH,
        thumbnailX, thumbnailY, thumbnailSize, thumbnailSize
      );
      
      // "Seen in this room" label
      ctx.fillStyle = '#888888';
      ctx.font = '20px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Seen in this room', thumbnailX + thumbnailSize / 2, thumbnailY + thumbnailSize + 30);
      
      console.log('[VendorShareModal] Thumbnail drawn');

      // Item name (left side, bold, large)
      const textX = contentPadding;
      let textY = contentY + 40;
      
      ctx.fillStyle = '#111111';
      ctx.font = 'bold 52px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      
      const itemName = item.item_name;
      const maxTextWidth = thumbnailX - textX - 40; // Leave gap before thumbnail
      
      // Word wrap for item name
      const words = itemName.split(' ');
      let line = '';
      const lineHeight = 62;

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxTextWidth && i > 0) {
          ctx.fillText(line.trim(), textX, textY);
          line = words[i] + ' ';
          textY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), textX, textY);
      textY += lineHeight + 20;

      console.log('[VendorShareModal] Item name drawn:', itemName);

      // Dominant color (if available)
      if (item.dominant_color) {
        ctx.fillStyle = '#666666';
        ctx.font = '28px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(`Color: ${item.dominant_color}`, textX, textY);
        textY += 40;
        console.log('[VendorShareModal] Dominant color drawn:', item.dominant_color);
      }

      // Dimensions (if available) - handle both string and object formats
      const formattedDimensions = formatDimensions(item);
      if (formattedDimensions) {
        ctx.fillStyle = '#666666';
        ctx.font = '28px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(`Size: ${formattedDimensions}`, textX, textY);
        textY += 40;
        console.log('[VendorShareModal] Dimensions drawn:', formattedDimensions);
      }

      // Quantity
      ctx.fillStyle = '#666666';
      ctx.font = '28px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('Quantity: 1', textX, textY);
      textY += 60;
      console.log('[VendorShareModal] Quantity drawn');

      // Load and draw Homable logo
      const logoImg = new Image();
      const logoSize = 50;
      
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = (error) => {
          console.error('[VendorShareModal] Failed to load logo:', error);
          reject(error);
        };
        // Don't set crossOrigin for local files
        logoImg.src = '/assets/homable-logo.png';
      });

      ctx.drawImage(logoImg, textX, textY, logoSize, logoSize);
      
      // Footer text next to logo
      ctx.fillStyle = '#888888';
      ctx.font = '22px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Generated by Homable Creations', textX + logoSize + 15, textY + 32);
      
      console.log('[VendorShareModal] Logo and footer drawn');

      // Convert canvas to data URL
      console.log('[VendorShareModal] Converting canvas to data URL...');
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      console.log('[VendorShareModal] Data URL generated, length:', dataUrl.length);
      
      setImageDataUrl(dataUrl);
      setGeneratingImage(false);
      hasGeneratedRef.current = true;
      console.log('[VendorShareModal] Image generation completed successfully');
    } catch (error) {
      console.error('[VendorShareModal] Failed to generate vendor image:', error);
      console.error('[VendorShareModal] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      toast.error('Failed to generate image. Please try again.');
      setGeneratingImage(false);
    }
  }, [item, inspirationImageUrl]);

  useEffect(() => {
    if (isOpen && !imageDataUrl && !hasGeneratedRef.current) {
      console.log('[VendorShareModal] Modal opened, triggering image generation');
      console.log('[VendorShareModal] Item:', item.item_name);
      console.log('[VendorShareModal] Dominant color:', item.dominant_color);
      console.log('[VendorShareModal] Dimensions:', item.dimensions);
      console.log('[VendorShareModal] Inspiration URL:', inspirationImageUrl);
      generateVendorImage();
    }
  }, [isOpen, imageDataUrl, generateVendorImage, item.item_name, inspirationImageUrl]);

  const handleDownload = () => {
    if (!imageDataUrl) {
      console.warn('[VendorShareModal] Download attempted but no image data URL available');
      return;
    }

    console.log('[VendorShareModal] Starting download...');
    const link = document.createElement('a');
    const fileName = `${item.item_name.replace(/\s+/g, '-').toLowerCase()}/images/photo1767780461.jpg`;
    link.download = fileName;
    link.href = imageDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('[VendorShareModal] Download triggered for:', fileName);
    toast.success('Image downloaded! Share it with vendors on Instagram or WhatsApp.');
  };

  const handleClose = () => {
    console.log('[VendorShareModal] Modal closing, resetting state');
    setImageDataUrl(null);
    setGeneratingImage(false);
    hasGeneratedRef.current = false;
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#111111]">
            Share with a vendor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {generatingImage ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C89F7A] mx-auto mb-4"></div>
                <p className="text-sm text-[#555555]">Generating image...</p>
              </div>
            </div>
          ) : imageDataUrl ? (
            <>
              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <img 
                  src={imageDataUrl} 
                  alt="Vendor share preview" 
                  className="w-full h-auto rounded-lg shadow-md"
                />
              </div>

              {/* Instructions */}
              <div className="bg-[#C89F7A]/10 rounded-lg p-4">
                <p className="text-sm text-[#111111] font-medium mb-2">
                  How to use:
                </p>
                <ol className="text-sm text-[#555555] space-y-1 list-decimal list-inside">
                  <li>Download this image to your device</li>
                  <li>Send it to vendors on Instagram or WhatsApp</li>
                  <li>Ask them for pricing and availability</li>
                </ol>
              </div>

              {/* Download button */}
              <Button
                onClick={handleDownload}
                className="w-full bg-[#C89F7A] hover:bg-[#B5896C] text-white rounded-full font-semibold"
                size="lg"
              >
                <Download className="h-5 w-5 mr-2" />
                Download Image
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-sm text-[#555555]">Failed to generate image. Please close and try again.</p>
                <Button
                  onClick={generateVendorImage}
                  className="mt-4 bg-[#C89F7A] hover:bg-[#B5896C] text-white rounded-full"
                  size="sm"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for image generation */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}