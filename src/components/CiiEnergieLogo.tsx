import React from 'react';

interface CiiEnergieLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'icon';
  showTagline?: boolean;
}

export const CiiEnergieIcon: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="CII ENERGIE Emblème"
  >
    {/* Outer Green Circular Arc - incomplete circle open at top */}
    <path
      d="M 33 30 A 37 37 0 1 0 66 38"
      stroke="#246b32"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    
    {/* Left Building with horizontal window louvers */}
    <rect 
      x="22" 
      y="48" 
      width="14" 
      height="33" 
      stroke="#246b32" 
      strokeWidth="2.8" 
      fill="#ffffff"
      rx="0.5"
    />
    <line x1="25" y1="54" x2="33" y2="54" stroke="#246b32" strokeWidth="2" strokeLinecap="round" />
    <line x1="25" y1="60" x2="33" y2="60" stroke="#246b32" strokeWidth="2" strokeLinecap="round" />
    <line x1="25" y1="66" x2="33" y2="66" stroke="#246b32" strokeWidth="2" strokeLinecap="round" />
    <line x1="25" y1="72" x2="33" y2="72" stroke="#246b32" strokeWidth="2" strokeLinecap="round" />
    <line x1="25" y1="77" x2="33" y2="77" stroke="#246b32" strokeWidth="2" strokeLinecap="round" />

    {/* Center Tower - tall eco-skyscraper piercing through top with angled roof */}
    <path
      d="M 36 81 L 36 29 L 45 19 L 45 9 L 47.5 9 L 47.5 19 L 55 26 L 55 81 Z"
      stroke="#246b32"
      strokeWidth="2.8"
      fill="#ffffff"
      strokeLinejoin="round"
    />
    {/* Internal vertical architectural spine */}
    <line x1="42" y1="29" x2="42" y2="81" stroke="#246b32" strokeWidth="1.8" />
    {/* Horizontal floor tiers */}
    <line x1="38" y1="35" x2="53" y2="35" stroke="#246b32" strokeWidth="1.6" />
    <line x1="38" y1="41" x2="53" y2="41" stroke="#246b32" strokeWidth="1.6" />
    <line x1="38" y1="47" x2="53" y2="47" stroke="#246b32" strokeWidth="1.6" />
    <line x1="38" y1="53" x2="53" y2="53" stroke="#246b32" strokeWidth="1.6" />
    <line x1="38" y1="59" x2="53" y2="59" stroke="#246b32" strokeWidth="1.6" />
    <line x1="38" y1="65" x2="53" y2="65" stroke="#246b32" strokeWidth="1.6" />
    <line x1="38" y1="71" x2="53" y2="71" stroke="#246b32" strokeWidth="1.6" />
    <line x1="38" y1="76" x2="53" y2="76" stroke="#246b32" strokeWidth="1.6" />

    {/* Right Tower Wing */}
    <path 
      d="M 55 48 L 61 48 L 61 81 L 55 81" 
      stroke="#246b32" 
      strokeWidth="2.6" 
      fill="#ffffff"
      strokeLinejoin="round"
    />
    <line x1="57" y1="57" x2="60" y2="57" stroke="#246b32" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="57" y1="65" x2="60" y2="65" stroke="#246b32" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="57" y1="73" x2="60" y2="73" stroke="#246b32" strokeWidth="1.6" strokeLinecap="round" />

    {/* Foundation / Ground base line */}
    <line x1="18" y1="81" x2="65" y2="81" stroke="#246b32" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export const CiiEnergieLogo: React.FC<CiiEnergieLogoProps> = ({ 
  className = "", 
  variant = 'full', 
  showTagline = true 
}) => {
  if (variant === 'icon') {
    return <CiiEnergieIcon className={className || "w-10 h-10"} />;
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Visual Emblem Badge */}
      <div className="w-12 h-12 shrink-0 flex items-center justify-center p-0.5 rounded-2xl bg-white border border-emerald-100 shadow-sm shadow-emerald-900/5">
        <CiiEnergieIcon className="w-full h-full" />
      </div>

      {/* Brand Identity & Taglines exactly matching the logo */}
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-baseline gap-1 font-extrabold tracking-tight text-[19px] leading-none font-display">
          <span className="text-[#246b32]">CII</span>
          <span className="text-[#7aba26]">ENERGIE</span>
        </div>

        {showTagline && (
          <div className="flex flex-col mt-1 tracking-wider leading-[1.12] text-[8px] font-semibold text-slate-800 uppercase font-sans">
            <span className="whitespace-nowrap">L'ENERGIE D'AUJOURD'HUI</span>
            <span className="whitespace-nowrap text-slate-500">LE CLIMAT DE DEMAIN</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CiiEnergieLogo;
