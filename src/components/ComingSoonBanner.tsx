import { Badge } from '@/components/ui/badge';

interface ComingSoonBannerProps {
  className?: string;
}

export default function ComingSoonBanner({ className = '' }: ComingSoonBannerProps) {
  return (
    <Badge
      variant="secondary"
      className={`bg-[#C89F7A]/20 text-[#8B6914] border border-[#C89F7A]/40 font-medium ${className}`}
    >
      Coming Soon
    </Badge>
  );
}
