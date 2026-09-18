import React from 'react';

interface CiiEnergieLogoProps {
  className?: string;
  align?: 'left' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CiiEnergieLogo: React.FC<CiiEnergieLogoProps> = ({ 
  className = "", 
  align = 'left',
  size = 'md'
}) => {
  const isCenter = align === 'center';

  const titleSizes = {
    sm: "text-lg tracking-tight",
    md: "text-2xl sm:text-[26px] tracking-tight",
    lg: "text-3xl sm:text-4xl tracking-tight",
    xl: "text-4xl sm:text-5xl tracking-tight"
  };

  return (
    <div className={`flex items-center ${isCenter ? 'justify-center text-center w-full' : 'justify-start text-left'} select-none whitespace-nowrap shrink-0 ${className}`}>
      {/* Brand Title: CII ENERGIE */}
      <h1 className={`flex items-baseline gap-1.5 sm:gap-2 font-black ${titleSizes[size]} leading-none font-display whitespace-nowrap`}>
        <span className="text-[#236b33] font-black tracking-tight">CII</span>
        <span className="text-[#7ec22a] font-black tracking-tight">ENERGIE</span>
      </h1>
    </div>
  );
};

export default CiiEnergieLogo;
