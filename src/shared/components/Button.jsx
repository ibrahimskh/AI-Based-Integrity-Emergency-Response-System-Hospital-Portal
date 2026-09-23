import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-lifeline-red text-white hover:bg-lifeline-red-dark shadow-sm',
  dark: 'bg-lifeline-ink text-white hover:bg-black shadow-sm',
  outline: 'bg-white text-lifeline-ink border border-lifeline-border hover:bg-slate-50',
  ghost: 'bg-transparent text-lifeline-ink hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
};

const SIZES = {
  sm: 'text-xs px-2.5 py-1.5 rounded-md gap-1.5',
  md: 'text-sm px-4 py-2 rounded-lg gap-2',
  lg: 'text-sm px-5 py-2.5 rounded-lg gap-2',
};

export default function Button({
  children, variant = 'primary', size = 'md', icon: Icon, loading = false,
  disabled = false, className = '', type = 'button', ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}
