import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const base = "inline-flex items-center justify-center font-medium rounded-control transition-colors duration-150 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60";

  const sizes = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-9 px-4 text-sm gap-2",
    lg: "h-10 px-5 text-sm gap-2",
  };

  const variants = {
    primary: "bg-brand text-white hover:bg-brand-hover active:bg-brand-pressed border border-transparent shadow-sm",
    secondary: "bg-white text-neutral-800 hover:bg-neutral-50 active:bg-neutral-100 border border-neutral-300",
    ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 border border-transparent",
    destructive: "bg-white text-semantic-danger border border-semantic-danger hover:bg-semantic-danger-tint",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin stroke-[2]" />}
      {children}
    </button>
  );
}
