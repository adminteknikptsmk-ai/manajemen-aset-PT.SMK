import React from 'react';
import { CompanyLogo } from './CompanyLogo';
import { KanLogo } from './KanLogo';

interface OfficialLetterheadProps {
  className?: string;
  showKan?: boolean;
  showDecoration?: boolean;
  subtitle?: string;
}

export const OfficialLetterhead: React.FC<OfficialLetterheadProps> = ({
  className = '',
  showKan = true,
  showDecoration = true,
  subtitle = 'Laboratorium Kalibrasi'
}) => {
  return (
    <div className={`relative w-full pb-4 select-none ${className}`} id="official-kop-surat-header">
      {/* Top Right Decorative Faceted Crystal Graphic (Exact match with official PT. SMK letterhead PDF) */}
      {showDecoration && (
        <div className="absolute -top-8 -right-8 sm:-top-12 sm:-right-12 print:-top-8 print:-right-8 w-52 h-44 sm:w-64 sm:h-52 overflow-hidden pointer-events-none z-0 print:opacity-100 opacity-95">
          <svg viewBox="0 0 320 250" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Upper Right Outer Facets */}
            <polygon points="320,0 320,110 230,40" fill="#0096c7" />
            <polygon points="320,0 230,40 180,0" fill="#48cae4" />
            <polygon points="180,0 230,40 130,0" fill="#90e0ef" />
            <polygon points="130,0 230,40 160,70" fill="#ade8f4" />
            <polygon points="130,0 160,70 90,30" fill="#caf0f8" />
            <polygon points="90,30 160,70 60,70" fill="#e0f7fa" />
            <polygon points="90,30 60,70 30,10" fill="#e0fcff" fillOpacity="0.8" />
            
            {/* Middle Facets */}
            <polygon points="230,40 320,110 245,130" fill="#0077b6" />
            <polygon points="320,110 320,195 270,165" fill="#023e8a" />
            <polygon points="320,110 270,165 245,130" fill="#0096c7" />
            <polygon points="320,195 320,250 285,220" fill="#03045e" fillOpacity="0.9" />
            <polygon points="320,195 285,220 270,165" fill="#023e8a" />
            <polygon points="270,165 285,220 230,190" fill="#0077b6" />
            
            {/* Lower-left Transition Facets */}
            <polygon points="160,70 230,40 245,130" fill="#00b4d8" />
            <polygon points="160,70 245,130 190,140" fill="#48cae4" />
            <polygon points="245,130 270,165 230,190" fill="#0096c7" />
            <polygon points="245,130 230,190 190,140" fill="#00b4d8" />
            <polygon points="60,70 160,70 120,120" fill="#b2ebf2" />
            <polygon points="160,70 190,140 120,120" fill="#80deea" />
            <polygon points="120,120 190,140 150,185" fill="#4dd0e1" />
            <polygon points="190,140 230,190 150,185" fill="#26c6da" />
          </svg>
        </div>
      )}

      {/* Main Header Content Grid: Left SMK Logo, Centered Company & Lab Title, Right KAN Badge */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        {/* Left: SMK Logo */}
        <div className="w-28 sm:w-36 shrink-0 flex items-center justify-start">
          <CompanyLogo size="lg" showSubtitle={false} variant="light" />
        </div>

        {/* Center: Company Name & Lab Title (Centered between logos) */}
        <div className="flex-1 text-center px-1">
          <h1 className="text-lg sm:text-[22px] font-black tracking-tight text-slate-950 uppercase font-sans leading-tight">
            PT. SARANA MULTI KALIBRASI
          </h1>
          <p className="text-sm sm:text-base font-bold tracking-tight text-slate-900 font-sans mt-0.5 leading-tight">
            {subtitle}
          </p>
        </div>

        {/* Right: KAN Accreditation Badge */}
        <div className="w-28 sm:w-36 shrink-0 flex items-center justify-end">
          {showKan ? (
            <div className="pr-1">
              <KanLogo size="md" />
            </div>
          ) : (
            <div className="w-4" />
          )}
        </div>
      </div>
    </div>
  );
};
