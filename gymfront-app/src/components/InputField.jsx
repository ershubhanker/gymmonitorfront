import React from 'react';

// Allowed keys for phone inputs (digits, +, -, space, and control keys)
const PHONE_ALLOWED_KEYS = new Set([
  'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End',
]);

const handlePhoneKeyDown = (e) => {
  const isDigit      = /^[0-9]$/.test(e.key);
  const isAllowed    = PHONE_ALLOWED_KEYS.has(e.key);
  const isSymbol     = e.key === '+' || e.key === '-' || e.key === ' ';
  const isCtrlCmd    = e.ctrlKey || e.metaKey; // allow Ctrl+A, Ctrl+C, Ctrl+V, etc.
  if (!isDigit && !isAllowed && !isSymbol && !isCtrlCmd) {
    e.preventDefault();
  }
};

const InputField = ({ 
  label, 
  type = 'text', 
  name, 
  register, 
  error, 
  icon: Icon,
  ...props 
}) => {
  const isTel = type === 'tel';

  return (
    <div className="mb-4">
      <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor={name}>
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <input
          id={name}
          type={type}
          {...register(name)}
          maxLength={isTel ? 15 : undefined}
          onKeyDown={isTel ? handlePhoneKeyDown : undefined}
          className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border ${
            error ? 'border-red-500' : 'border-gray-300'
          } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default InputField;