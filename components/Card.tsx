import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export default function Card({
  children,
  className = '',
  hoverable = true,
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-[#FFFFFF] border border-[#C1C7D0] p-6 transition-all duration-200 ${
        hoverable ? 'hover:border-[#000000]' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
