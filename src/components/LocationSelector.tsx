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
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'OTHER', name: 'Other', flag: '🌍' },
];

const STORAGE_KEY = 'homable_selected_country';

export default function LocationSelector() {
  const [selectedLocation, setSelectedLocation] = useState<Location>(LOCATIONS[0]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load saved location from localStorage
    const savedCountry = localStorage.getItem(STORAGE_KEY);
    if (savedCountry) {
      const location = LOCATIONS.find(loc => loc.code === savedCountry);
      if (location) {
        setSelectedLocation(location);
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
      
      const location = LOCATIONS.find(loc => loc.code === countryCode);
      if (location) {
        setSelectedLocation(location);
        localStorage.setItem(STORAGE_KEY, location.code);
      }
    } catch (error) {
      console.error('[LocationSelector] Failed to detect location:', error);
      // Default to Nigeria
      localStorage.setItem(STORAGE_KEY, 'NG');
    }
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    localStorage.setItem(STORAGE_KEY, location.code);
    setIsOpen(false);
    
    // Dispatch custom event to notify other components
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
  return localStorage.getItem(STORAGE_KEY) || 'NG';
}