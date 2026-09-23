export function Field({ label, error, required, children, hint }) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wide text-lifeline-sub mb-1.5">
          {label} {required && <span className="text-lifeline-red">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-lifeline-sub mt-1">{hint}</p>}
      {error && <p className="text-xs text-lifeline-red font-medium mt-1">{error}</p>}
    </div>
  );
}

const baseInput = 'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-lifeline-red/20';

export function Input({ error, className = '', ...rest }) {
  return (
    <input
      className={`${baseInput} ${error ? 'border-lifeline-red' : 'border-lifeline-border focus:border-lifeline-red'} ${className}`}
      {...rest}
    />
  );
}

export function Select({ error, className = '', children, ...rest }) {
  return (
    <select
      className={`${baseInput} bg-white ${error ? 'border-lifeline-red' : 'border-lifeline-border focus:border-lifeline-red'} ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Textarea({ error, className = '', ...rest }) {
  return (
    <textarea
      className={`${baseInput} resize-none ${error ? 'border-lifeline-red' : 'border-lifeline-border focus:border-lifeline-red'} ${className}`}
      rows={3}
      {...rest}
    />
  );
}
