import { Link } from 'react-router-dom';
import { Mail, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-black py-6">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-white">
            © 2025 Homable Creations · All rights reserved
          </p>
          <p className="text-sm text-white flex items-center justify-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              <a href="mailto:homablecreations@gmail.com" className="hover:text-gray-300 transition-colors">homablecreations@gmail.com</a>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Instagram className="h-3.5 w-3.5" />
              <a href="https://instagram.com/homable_creations" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">@homable_creations</a>
            </span>
            <span>·</span>
            <Link to="/privacy-policy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
          </p>
          <p className="text-xs text-white/80">
            Some links may be affiliate links, which help support Homable at no extra cost to you.
          </p>
        </div>
      </div>
    </footer>
  );
}