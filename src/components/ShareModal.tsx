import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardName: string;
}

export default function ShareModal({ isOpen, onClose, boardId, boardName }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = `${window.location.origin}/item-detection/${boardId}`;
  const shareMessage = `Check out the look I'm recreating! ${boardName}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#111111]">
            Share what you're building ✨
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#555555]">
              Share this link
            </label>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                onClick={handleCopy}
                variant="outline"
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#555555]">
              Pre-written message
            </label>
            <Input
              value={shareMessage}
              readOnly
              className="bg-gray-50"
              onClick={(e) => e.currentTarget.select()}
            />
          </div>

          <div className="pt-4">
            <Button
              onClick={onClose}
              className="w-full bg-[#111111] hover:bg-[#333333] text-white"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}