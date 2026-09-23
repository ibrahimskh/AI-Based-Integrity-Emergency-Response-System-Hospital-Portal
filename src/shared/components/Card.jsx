export default function Card({ children, className = '', padded = true }) {
  return (
    <div className={`bg-white rounded-2xl border border-lifeline-border shadow-sm ${padded ? 'p-5 sm:p-6' : ''} ${className}`}>
      {children}
    </div>
  );
}
