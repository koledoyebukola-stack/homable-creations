import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { useCountry, type CountryCode } from '@/context/CountryContext';

interface Location {
  code: string;
  name: string;
  flag: string;
}

const LOCATIONS: Location[] = [
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'OTHER', name: 'Other', flag: '🌍' },
];

export default function LocationSelector() {
  const { country, setCountry } = useCountry();

  const selectedLocation: Location = useMemo(() => {
    const effectiveCode: CountryCode = country ?? 'OTHER';
    return (
      LOCATIONS.find((loc) => loc.code === effectiveCode) ??
      LOCATIONS.find((loc) => loc.code === 'OTHER')!
    );
  }, [country]);

  const handleLocationSelect = (location: Location) => {
    setCountry(location.code as CountryCode);
  };

  // Single display value so flag and label always update atomically (avoids "Cauntries"-style glitches on mobile)
  const triggerLabel = `${selectedLocation.flag} ${selectedLocation.name}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 rounded-full bg-white/90 hover:bg-white border-[#E5E5E5] text-[#555555] font-normal"
          key={selectedLocation.code}
        >
          <Globe className="h-4 w-4 mr-2 shrink-0" />
          <span>{triggerLabel}</span>
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
export { getSelectedCountry } from '@/context/CountryContext';