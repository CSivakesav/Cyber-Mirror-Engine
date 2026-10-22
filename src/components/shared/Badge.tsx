import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'cyan' | 'yellow' | 'red' | 'purple' | 'gray';
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'green',
  size = 'md',
  pulse = false,
}) => {
  const variantStyles = {
    green: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
    cyan: 'bg-sky-50 text-sky-600 border-sky-200/80',
    yellow: 'bg-amber-50 text-amber-600 border-amber-200/80',
    red: 'bg-rose-50 text-rose-600 border-rose-200/80',
    purple: 'bg-indigo-50 text-indigo-600 border-indigo-200/80',
    gray: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5',
    md: 'text-xs px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold border rounded-full ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              variant === 'red' ? 'bg-rose-400' : 'bg-emerald-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              variant === 'red' ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
          />
        </span>
      )}
      {children}
    </span>
  );
};
