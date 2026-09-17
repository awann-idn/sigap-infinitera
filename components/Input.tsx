import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full flex flex-col gap-2">
      {label && (
        <label className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#272E3B] font-bold">
          {label}
        </label>
      )}
      <input
        className={`h-[48px] px-4 bg-[#FFFFFF] border border-[#C1C7D0] text-[#000000] font-medium placeholder-[#4B5565] font-body text-[15px] focus:outline-none focus:border-[#000000] focus:ring-2 focus:ring-[#000000] transition-colors ${className}`}
        {...props}
      />
      {error && <span className="font-mono text-[12px] text-[#B91C1C] font-bold">{error}</span>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="w-full flex flex-col gap-2">
      {label && (
        <label className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#272E3B] font-bold">
          {label}
        </label>
      )}
      <textarea
        className={`p-4 bg-[#FFFFFF] border border-[#C1C7D0] text-[#000000] font-medium placeholder-[#4B5565] font-body text-[15px] focus:outline-none focus:border-[#000000] focus:ring-2 focus:ring-[#000000] transition-colors resize-y min-h-[120px] ${className}`}
        {...props}
      />
      {error && <span className="font-mono text-[12px] text-[#B91C1C] font-bold">{error}</span>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

export function Select({ label, error, className = '', children, ...props }: SelectProps) {
  return (
    <div className="w-full flex flex-col gap-2">
      {label && (
        <label className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#272E3B] font-bold">
          {label}
        </label>
      )}
      <select
        className={`h-[48px] px-4 bg-[#FFFFFF] border border-[#C1C7D0] text-[#000000] font-medium font-body text-[15px] focus:outline-none focus:border-[#000000] focus:ring-2 focus:ring-[#000000] transition-colors ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="font-mono text-[12px] text-[#B91C1C] font-bold">{error}</span>}
    </div>
  );
}
