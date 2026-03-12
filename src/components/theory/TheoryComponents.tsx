'use client';

import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Definition component - highlighted box for key definitions
 */
interface DefinitionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Definition({ title = 'Définition', children, className }: DefinitionProps) {
  return (
    <div
      className={cn(
        'my-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-5 h-5 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="font-semibold text-blue-800">{title}</span>
      </div>
      <div className="text-blue-900 prose prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed">
        {children}
      </div>
    </div>
  );
}

/**
 * Formula component - styled block for important equations
 */
interface FormulaProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Formula({ title, children, className }: FormulaProps) {
  return (
    <div
      className={cn(
        'my-6 rounded-lg border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-4',
        className
      )}
    >
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <svg
            className="w-5 h-5 text-violet-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <span className="font-semibold text-violet-800">{title}</span>
        </div>
      )}
      <div className="text-violet-900 overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

/**
 * Example component - collapsible worked example block
 */
interface ExampleProps {
  title?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function Example({ title = 'Exemple', children, defaultOpen = false, className }: ExampleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        'my-6 rounded-lg border border-amber-200 bg-amber-50 overflow-hidden',
        className
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <span className="font-semibold text-amber-800">{title}</span>
        </div>
        <svg
          className={cn(
            'w-5 h-5 text-amber-600 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-amber-900 prose prose-sm max-w-none prose-p:my-2">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Note component - side note or warning callout
 */
interface NoteProps {
  type?: 'info' | 'warning' | 'tip';
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Note({ type = 'info', title, children, className }: NoteProps) {
  const styles = {
    info: {
      container: 'border-sky-300 bg-sky-50',
      icon: 'text-sky-600',
      title: 'text-sky-800',
      text: 'text-sky-900',
    },
    warning: {
      container: 'border-orange-300 bg-orange-50',
      icon: 'text-orange-600',
      title: 'text-orange-800',
      text: 'text-orange-900',
    },
    tip: {
      container: 'border-emerald-300 bg-emerald-50',
      icon: 'text-emerald-600',
      title: 'text-emerald-800',
      text: 'text-emerald-900',
    },
  };

  const icons = {
    info: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    warning: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    ),
    tip: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    ),
  };

  const defaultTitles = {
    info: 'Remarque',
    warning: 'Attention',
    tip: 'Conseil',
  };

  const style = styles[type];
  const displayTitle = title || defaultTitles[type];

  return (
    <div
      className={cn(
        'my-6 rounded-lg border-l-4 p-4',
        style.container,
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <svg
          className={cn('w-5 h-5', style.icon)}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {icons[type]}
        </svg>
        <span className={cn('font-semibold', style.title)}>{displayTitle}</span>
      </div>
      <div className={cn('prose prose-sm max-w-none prose-p:my-1', style.text)}>
        {children}
      </div>
    </div>
  );
}

/**
 * Table component for data tables in theory content
 */
interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('my-6 overflow-x-auto', className)}>
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
        {children}
      </table>
    </div>
  );
}

/**
 * Section heading for theory content
 */
interface SectionProps {
  children: ReactNode;
  className?: string;
}

export function Section({ children, className }: SectionProps) {
  return (
    <h2 className={cn('text-2xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-200', className)}>
      {children}
    </h2>
  );
}

export function Subsection({ children, className }: SectionProps) {
  return (
    <h3 className={cn('text-xl font-semibold text-gray-800 mt-6 mb-3', className)}>
      {children}
    </h3>
  );
}
