import React from 'react';

interface SectionHeaderProps {
  eyebrow: string;
  counter?: string;
  title: string;
  description?: string;
  className?: string;
}

export default function SectionHeader({
  eyebrow,
  counter,
  title,
  description,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`w-full mb-12 ${className}`}>
      {/* Eyebrow Row */}
      <div className="w-full flex items-center justify-between pb-3 border-b-2 border-[#000000] font-mono text-[12px] tracking-[0.08em] text-[#000000] font-bold uppercase">
        <span className="flex items-center gap-2">
          {eyebrow}
        </span>
        {counter && <span className="font-mono text-[#000000] font-bold">{counter}</span>}
      </div>

      {/* Headline - Giant Display Type */}
      <h2 className="font-display text-[clamp(32px,4.5vw,64px)] font-bold tracking-[-0.03em] text-[#000000] leading-[1.05] mt-6 uppercase">
        {title}
      </h2>

      {/* Optional Description */}
      {description && (
        <p className="font-body text-[16px] text-[#272E3B] leading-[1.6] max-w-2xl mt-4 font-medium">
          {description}
        </p>
      )}
    </div>
  );
}
