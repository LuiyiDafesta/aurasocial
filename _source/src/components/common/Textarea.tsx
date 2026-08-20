import React, { TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  charCount?: number;
  maxCharCount?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, charCount, maxCharCount, id, rows = 4, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={textareaId} className="block text-xs font-semibold text-slate-300">
              {label}
            </label>
          )}
          {maxCharCount !== undefined && (
            <span
              className={cn(
                'text-[11px] font-mono',
                charCount !== undefined && charCount > maxCharCount
                  ? 'text-rose-400 font-semibold'
                  : 'text-slate-400'
              )}
            >
              {charCount ?? 0} / {maxCharCount}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(
            'w-full bg-dark-900 border border-dark-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors leading-relaxed',
            'focus:outline-none focus:border-aura-500 focus:ring-1 focus:ring-aura-500/40 resize-y',
            'disabled:opacity-50 disabled:bg-dark-950 disabled:cursor-not-allowed',
            error && 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-rose-400 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
