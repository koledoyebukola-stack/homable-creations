import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';

interface EditClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (expectedDate?: string, giftNote?: string) => Promise<void>;
  onUnclaim: () => Promise<void>;
  itemName: string;
  currentExpectedDate?: string;
  currentGiftNote?: string;
  claimedByName: string;
}

export default function EditClaimModal({
  isOpen,
  onClose,
  onUpdate,
  onUnclaim,
  itemName,
  currentExpectedDate,
  currentGiftNote,
  claimedByName,
}: EditClaimModalProps) {
  const [expectedDate, setExpectedDate] = useState('');
  const [giftNote, setGiftNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unclaiming, setUnclaiming] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setExpectedDate(currentExpectedDate || '');
      setGiftNote(currentGiftNote || '');
      checkAuth();
    }
  }, [isOpen, currentExpectedDate, currentGiftNote]);

  const checkAuth = async () => {
    setCheckingAuth(true);
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    setCheckingAuth(false);

    if (!user) {
      setShowAuthModal(true);
    }
  };

  const handleUpdate = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    try {
      setSubmitting(true);
      await onUpdate(expectedDate || undefined, giftNote.trim() || undefined);
      onClose();
    } catch (error) {
      console.error('Failed to update claim:', error);
      // Error handling is done in parent component
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnclaim = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (!confirm('Are you sure you want to unclaim this item?')) {
      return;
    }

    try {
      setUnclaiming(true);
      await onUnclaim();
      onClose();
    } catch (error) {
      console.error('Failed to unclaim item:', error);
      // Error handling is done in parent component
    } finally {
      setUnclaiming(false);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
    // Reload page data after sign-in to show "Gifts I'm helping with" section
    window.location.reload();
  };

  const handleClose = () => {
    if (!submitting && !unclaiming) {
      setExpectedDate('');
      setGiftNote('');
      onClose();
    }
  };

  if (checkingAuth) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen && !showAuthModal} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#111111]">
              Edit Claim: "{itemName}"
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Claimed by: <span className="font-medium">{claimedByName}</span>
              </p>
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
                disabled={submitting || unclaiming}
                className="w-full"
                min={new Date().toISOString().split('T')[0]}
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
                disabled={submitting || unclaiming}
                className="w-full min-h-[80px]"
                maxLength={200}
              />
              <p className="text-xs text-gray-500">
                {giftNote.length}/200 characters
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleUnclaim}
              disabled={submitting || unclaiming}
              className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {unclaiming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Unclaiming...
                </>
              ) : (
                'Unclaim Item'
              )}
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={submitting || unclaiming}
                className="flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={submitting || unclaiming}
                className="flex-1 sm:flex-initial bg-[#111111] hover:bg-[#333333] text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          if (!isAuthenticated) {
            onClose();
          }
        }}
        onSuccess={handleAuthSuccess}
        message="Sign in to edit or track this gift"
      />
    </>
  );
}
