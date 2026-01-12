'use client';

import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  unit?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, unit, leftIcon, rightIcon, type = 'text', id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              'block w-full rounded-lg border transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              leftIcon ? 'pl-10' : 'pl-4',
              rightIcon || unit ? 'pr-10' : 'pr-4',
              'py-2.5 text-gray-900 placeholder:text-gray-400',
              error
                ? 'border-error-500 focus:border-error-500 focus:ring-error-200'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200',
              props.disabled && 'bg-gray-50 cursor-not-allowed',
              className
            )}
            {...props}
          />

          {(rightIcon || unit) && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
              {unit ? <span className="text-sm font-medium">{unit}</span> : rightIcon}
            </div>
          )}
        </div>

        {(error || hint) && (
          <p
            className={cn(
              'mt-1 text-sm',
              error ? 'text-error-500' : 'text-gray-500'
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Variante pour les réponses numériques
export interface NumericInputProps extends Omit<InputProps, 'type' | 'onChange'> {
  value: number | '';
  onChange: (value: number | '') => void;
  min?: number;
  max?: number;
  step?: number;
}

const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, min, max, step = 1, ...props }, ref) => {
    const [localValue, setLocalValue] = useState(value.toString());

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setLocalValue(raw);

      if (raw === '' || raw === '-') {
        onChange('');
        return;
      }

      const num = parseFloat(raw);
      if (!isNaN(num)) {
        if (min !== undefined && num < min) return;
        if (max !== undefined && num > max) return;
        onChange(num);
      }
    };

    const handleBlur = () => {
      if (value !== '') {
        setLocalValue(value.toString());
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

NumericInput.displayName = 'NumericInput';

export { Input, NumericInput };
