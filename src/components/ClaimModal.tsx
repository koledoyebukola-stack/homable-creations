import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, expectedDate?: string, giftNote?: string) => Promise<void>;
  itemName: string;
}

export default function ClaimModal({ isOpen, onClose, onConfirm, itemName }: ClaimModalProps) {
  const [name, setName] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [giftNote, setGiftNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      return; // Name is required
    }

    try {
      setSubmitting(true);
      await onConfirm(name.trim(), expectedDate || undefined, giftNote.trim() || undefined);
      // Reset form
      setName('');
      setExpectedDate('');
      setGiftNote('');
      onClose();
    } catch (error) {
      console.error('Failed to claim item:', error);
      // Error handling is done in parent component
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setName('');
      setExpectedDate('');
      setGiftNote('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#111111]">
            Claim "{itemName}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-[#555555]">
              Your Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Aisha & Tunde"
              disabled={submitting}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedDate" className="text-sm font-medium text-[#555555]">
              Expected Delivery Date (optional)
            </Label>
            <Input
              id="expectedDate"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              disabled={submitting}
              className="w-full"
              min={new Date().toISOString().split('T')[0]} // Today or later
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="giftNote" className="text-sm font-medium text-[#555555]">
              Gift Note (optional)
            </Label>
            <Textarea
              id="giftNote"
              value={giftNote}
              onChange={(e) => setGiftNote(e.target.value)}
              placeholder="e.g., From Aisha & Tunde"
              disabled={submitting}
              className="w-full min-h-[80px]"
              maxLength={200}
            />
            <p className="text-xs text-gray-500">
              {giftNote.length}/200 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            className="bg-[#111111] hover:bg-[#333333] text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Claiming...
              </>
            ) : (
              'Claim Item'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
