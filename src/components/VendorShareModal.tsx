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

// Helper function to convert remote image URL to blob URL
async function imageUrlToBlobUrl(imageUrl: string): Promise<string> {
  console.log('[VendorShareModal] PRODUCTION DEBUG - Fetching image from:', imageUrl);
  console.log('[VendorShareModal] PRODUCTION DEBUG - Image URL type:', imageUrl.startsWith('http') ? 'HTTP URL' : imageUrl.startsWith('blob:') ? 'Blob URL' : 'Unknown');
  
  try {
    const response = await fetch(imageUrl, { mode: 'cors' });
    console.log('[VendorShareModal] PRODUCTION DEBUG - Fetch response status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} - URL: ${imageUrl}`);
    }
    
    const blob = await response.blob();
    console.log('[VendorShareModal] PRODUCTION DEBUG - Blob created, size:', blob.size, 'type:', blob.type);
    
    const blobUrl = URL.createObjectURL(blob);
    console.log('[VendorShareModal] PRODUCTION DEBUG - Blob URL created:', blobUrl);
    
    return blobUrl;
  } catch (error) {
    console.error('[VendorShareModal] PRODUCTION ERROR - Failed to convert image to blob:', error);
    console.error('[VendorShareModal] PRODUCTION ERROR - Original URL was:', imageUrl);
    throw error;
  }
}

export default function VendorShareModal({ isOpen, onClose, item, inspirationImageUrl }: VendorShareModalProps) {
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasGeneratedRef = useRef(false);
  const blobUrlsRef = useRef<string[]>([]);

  // Helper function to format dimensions for display
  const formatDimensions = (item: DetectedItem): string | null => {
    if (typeof item.dimensions === 'string') {
      return item.dimensions;
    }
    
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
    console.log('[VendorShareModal] PRODUCTION DEBUG - Starting image generation...');
    console.log('[VendorShareModal] PRODUCTION DEBUG - Inspiration image URL:', inspirationImageUrl);
    setGeneratingImage(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error('[VendorShareModal] PRODUCTION ERROR - Canvas ref is null');
        setGeneratingImage(false);
        toast.error('Canvas not ready. Please try again.');
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('[VendorShareModal] PRODUCTION ERROR - Failed to get 2D context');
        setGeneratingImage(false);
        toast.error('Failed to initialize canvas context');
        return;
      }

      const size = 1200;
      canvas.width = size;
      canvas.height = size;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);

      // Convert inspiration image URL to blob URL first
      console.log('[VendorShareModal] PRODUCTION DEBUG - Converting inspiration image to blob...');
      const inspirationBlobUrl = await imageUrlToBlobUrl(inspirationImageUrl);
      blobUrlsRef.current.push(inspirationBlobUrl);

      // Load inspiration image from blob URL (no CORS issues)
      console.log('[VendorShareModal] PRODUCTION DEBUG - Loading inspiration image from blob URL...');
      const inspirationImg = new Image();
      inspirationImg.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        inspirationImg.onload = () => {
          console.log('[VendorShareModal] PRODUCTION DEBUG - Inspiration image loaded successfully');
          resolve(null);
        };
        inspirationImg.onerror = (error) => {
          console.error('[VendorShareModal] PRODUCTION ERROR - Failed to load inspiration image:', error);
          reject(new Error('Failed to load inspiration image'));
        };
        inspirationImg.src = inspirationBlobUrl;
      });

      // Draw hero image (top 60%)
      const heroHeight = size * 0.60;
      const heroWidth = size;
      
      const minDim = Math.min(inspirationImg.width, inspirationImg.height);
      const cropRegion = {
        x: Math.round((inspirationImg.width - minDim) / 2),
        y: Math.round((inspirationImg.height - minDim) / 2),
        width: minDim,
        height: minDim
      };

      ctx.drawImage(
        inspirationImg,
        cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height,
        0, 0, heroWidth, heroHeight
      );

      // Content area
      const contentY = heroHeight + 40;
      const contentPadding = 60;

      // Draw thumbnail
      const thumbnailSize = 280;
      const thumbnailX = size - thumbnailSize - contentPadding;
      const thumbnailY = contentY + 20;
      
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
      
      ctx.strokeStyle = '#E5E5E5';
      ctx.lineWidth = 2;
      ctx.strokeRect(thumbnailX, thumbnailY, thumbnailSize, thumbnailSize);
      
      ctx.drawImage(
        inspirationImg,
        thumbCropX, thumbCropY, thumbCropW, thumbCropH,
        thumbnailX, thumbnailY, thumbnailSize, thumbnailSize
      );
      
      ctx.fillStyle = '#888888';
      ctx.font = '20px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Seen in this room', thumbnailX + thumbnailSize / 2, thumbnailY + thumbnailSize + 30);

      // Item name
      const textX = contentPadding;
      let textY = contentY + 40;
      
      ctx.fillStyle = '#111111';
      ctx.font = 'bold 52px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      
      const itemName = item.item_name;
      const maxTextWidth = thumbnailX - textX - 40;
      
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

      // Dominant color
      if (item.dominant_color) {
        ctx.fillStyle = '#666666';
        ctx.font = '28px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(`Color: ${item.dominant_color}`, textX, textY);
        textY += 40;
      }

      // Dimensions
      const formattedDimensions = formatDimensions(item);
      if (formattedDimensions) {
        ctx.fillStyle = '#666666';
        ctx.font = '28px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(`Size: ${formattedDimensions}`, textX, textY);
        textY += 40;
      }

      // Quantity
      ctx.fillStyle = '#666666';
      ctx.font = '28px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('Quantity: 1', textX, textY);
      textY += 60;

      // Load and draw the CORRECT brand logo from Supabase
      console.log('[VendorShareModal] PRODUCTION DEBUG - Loading brand logo from Supabase');
      const logoBlobUrl = await imageUrlToBlobUrl('https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/images/image.png');
      blobUrlsRef.current.push(logoBlobUrl);
      
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      const logoSize = 50;
      
      await new Promise((resolve, reject) => {
        logoImg.onload = () => {
          console.log('[VendorShareModal] PRODUCTION DEBUG - Brand logo loaded successfully');
          resolve(null);
        };
        logoImg.onerror = (error) => {
          console.error('[VendorShareModal] PRODUCTION ERROR - Failed to load brand logo:', error);
          reject(error);
        };
        logoImg.src = logoBlobUrl;
      });

      ctx.drawImage(logoImg, textX, textY, logoSize, logoSize);
      
      ctx.fillStyle = '#888888';
      ctx.font = '22px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Generated by Homable Creations', textX + logoSize + 15, textY + 32);

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      setImageDataUrl(dataUrl);
      setGeneratingImage(false);
      hasGeneratedRef.current = true;
      console.log('[VendorShareModal] PRODUCTION DEBUG - Image generation completed successfully');
    } catch (error) {
      console.error('[VendorShareModal] PRODUCTION ERROR - Failed to generate vendor image:', error);
      toast.error('Failed to generate image. Please check console for details.');
      setGeneratingImage(false);
    }
  }, [item, inspirationImageUrl]);

  useEffect(() => {
    if (isOpen && !imageDataUrl && !hasGeneratedRef.current) {
      generateVendorImage();
    }
  }, [isOpen, imageDataUrl, generateVendorImage]);

  // Cleanup blob URLs when modal closes
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      blobUrlsRef.current = [];
    };
  }, []);

  const handleDownload = () => {
    if (!imageDataUrl) return;

    const link = document.createElement('a');
    const fileName = `${item.item_name.replace(/\s+/g, '-').toLowerCase()}/images/photo1767785902.jpg`;
    link.download = fileName;
    link.href = imageDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Image downloaded! Share it with vendors on Instagram or WhatsApp.');
  };

  const handleClose = () => {
    setImageDataUrl(null);
    setGeneratingImage(false);
    hasGeneratedRef.current = false;
    blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
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
              <div className="bg-gray-50 rounded-lg p-4">
                <img 
                  src={imageDataUrl} 
                  alt="Vendor share preview" 
                  className="w-full h-auto rounded-lg shadow-md"
                />
              </div>

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

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}