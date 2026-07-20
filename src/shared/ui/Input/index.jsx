import { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  className = '',
  type = 'text',
  ...props
}, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-bold text-slate-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={`
          w-full px-4 py-2.5 rounded-xl border-2 bg-white
          transition-all duration-200
          placeholder:text-slate-400
          focus:outline-none focus:ring-2 focus:ring-offset-0
          ${error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-200 text-red-600'
            : 'border-slate-200 focus:border-blue-400 focus:ring-blue-200 text-slate-800'
          }
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
