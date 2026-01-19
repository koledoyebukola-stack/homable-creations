import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface CountryChangeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentCountry: string;
  newCountry: string;
}

const COUNTRY_NAMES: Record<string, string> = {
  NG: 'Nigeria',
  US: 'United States',
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  CA: 'Canada',
  OTHER: 'Other',
};

export default function CountryChangeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  currentCountry,
  newCountry,
}: CountryChangeConfirmationModalProps) {
  const currentCountryName = COUNTRY_NAMES[currentCountry] || currentCountry;
  const newCountryName = COUNTRY_NAMES[newCountry] || newCountry;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Change Market Location?</DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-3 pt-2">
            <p>
              You're about to change the market location from <strong>{currentCountryName}</strong> to <strong>{newCountryName}</strong>.
            </p>
            <p className="font-medium text-foreground">
              This will affect:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
              <li>Product prices and availability</li>
              <li>Material recommendations</li>
              <li>Retailer suggestions</li>
              <li>Carpenter specifications (if applicable)</li>
            </ul>
            <p className="text-sm">
              All product matches will be refreshed for the new market. This change only applies to your current session and won't be saved to your board.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-[#111111] hover:bg-[#333333]">
            Change Market
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
