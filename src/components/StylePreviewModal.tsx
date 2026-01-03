import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface StylePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  styleName: string;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export default function StylePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  styleName,
  onAnalyze,
  isAnalyzing
}: StylePreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] sm:max-w-2xl p-0 gap-0 bg-white rounded-3xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
        </button>

        {/* Image */}
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          <img
            src={imageUrl}
            alt={styleName}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Action button */}
        <div className="p-4 sm:p-6">
          <Button
            size="lg"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="w-full bg-[#111111] hover:bg-[#333333] text-white text-base sm:text-lg py-5 sm:py-6 rounded-full"
          >
            {isAnalyzing ? 'Starting Analysis...' : 'Analyze My Inspiration'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}