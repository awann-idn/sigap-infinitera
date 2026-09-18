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
    'h-[48px] px-5 sm:px-8 font-mono text-[12px] sm:text-[13px] text-center font-bold tracking-[0.08em] uppercase inline-flex items-center justify-center gap-2 transition-colors duration-150 border-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none';

  const variants = {
    primary:
      'bg-[#800020] text-[#FFFFFF] border-[#800020] hover:bg-[#9E1B36] hover:border-[#9E1B36] active:bg-[#5C0016] active:border-[#5C0016]',
    outline:
      'bg-[#FFFFFF] text-[#800020] border-[#800020] hover:bg-[#F3E6D5]',
    ghost:
      'bg-transparent text-[#800020] border-transparent hover:bg-[#F3E6D5]',
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
