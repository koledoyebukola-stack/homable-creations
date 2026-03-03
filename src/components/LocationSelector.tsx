import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

interface Location {
  code: string;
  name: string;
  flag: string;
}

const LOCATIONS: Location[] = [
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'OTHER', name: 'Other Countries', flag: '🌍' },
];

const STORAGE_KEY = 'homable_selected_country';

export default function LocationSelector() {
  const [selectedLocation, setSelectedLocation] = useState<Location>(LOCATIONS[0]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load saved location from localStorage
    const savedCountry = localStorage.getItem(STORAGE_KEY);
    if (savedCountry) {
      let effectiveCode = savedCountry;
      if (savedCountry === 'US' || savedCountry === 'GB') {
        effectiveCode = 'OTHER';
      }
      const location = LOCATIONS.find(loc => loc.code === effectiveCode) || LOCATIONS[0];
      setSelectedLocation(location);
      if (effectiveCode !== savedCountry) {
        localStorage.setItem(STORAGE_KEY, effectiveCode);
      }
    } else {
      // Try to detect location via IP (fallback to Nigeria)
      detectLocation();
    }
  }, []);

  const detectLocation = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      const countryCode = data.country_code;

      const mappedCode =
        countryCode === 'US' || countryCode === 'GB' ? 'OTHER' : countryCode;
      const location = LOCATIONS.find(loc => loc.code === mappedCode);
      if (location) {
        setSelectedLocation(location);
        localStorage.setItem(STORAGE_KEY, location.code);
      }
    } catch (error) {
      console.error('[LocationSelector] Failed to detect location:', error);
      localStorage.setItem(STORAGE_KEY, 'NG');
    }
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    localStorage.setItem(STORAGE_KEY, location.code);
    setIsOpen(false);

    window.dispatchEvent(new CustomEvent('locationChanged', {
      detail: { country: location.code }
    }));
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 rounded-full bg-white/90 hover:bg-white border-[#E5E5E5] text-[#555555] font-normal"
        >
          <Globe className="h-4 w-4 mr-2" />
          <span className="mr-1">{selectedLocation.flag}</span>
          <span>{selectedLocation.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {LOCATIONS.map((location) => (
          <DropdownMenuItem
            key={location.code}
            onClick={() => handleLocationSelect(location)}
            className={`cursor-pointer ${
              selectedLocation.code === location.code
                ? 'bg-[#C89F7A]/10 text-[#C89F7A] font-medium'
                : ''
            }`}
          >
            <span className="mr-2">{location.flag}</span>
            <span>{location.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Helper function to get current selected country
export function getSelectedCountry(): string {
  const stored = localStorage.getItem(STORAGE_KEY) || 'NG';
  if (stored === 'US' || stored === 'GB') {
    return 'OTHER';
  }
  return stored;
}