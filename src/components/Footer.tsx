import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center space-y-3">
          <p className="text-sm text-[#888888]">
            © 2025 Homable Creations. All rights reserved.
          </p>
          <p className="text-sm text-[#888888]">
            Contact: <a href="mailto:homablecreations@gmail.com" className="hover:text-[#111111] transition-colors">homablecreations@gmail.com</a>
          </p>
          <p className="text-sm text-[#888888]">
            Instagram: <a href="https://instagram.com/homable_creations" target="_blank" rel="noopener noreferrer" className="hover:text-[#111111] transition-colors">@homable_creations</a>
          </p>
          <p className="text-xs text-[#888888] pt-2">
            Some links may be affiliate links, which help support Homable at no extra cost to you.
          </p>
          <p className="text-xs text-[#888888]">
            <Link to="/privacy-policy" className="hover:text-[#111111] transition-colors underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}