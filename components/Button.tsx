import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'h-[48px] px-8 font-mono text-[13px] font-bold tracking-[0.08em] uppercase inline-flex items-center justify-center transition-colors duration-150 border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none';

  const variants = {
    primary:
      'bg-[#000000] text-[#FFFFFF] hover:bg-[#222222] active:bg-[#000000]',
    outline:
      'bg-[#FFFFFF] text-[#000000] border-2 border-[#000000] hover:bg-[#F3F4F6]',
    ghost:
      'bg-transparent text-[#000000] hover:bg-[#FFFFFF]',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
