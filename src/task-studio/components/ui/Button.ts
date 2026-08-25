/**
 * @license Apache-2.0
 * @samrey/task-studio - Accessible Button Component
 */

import { el } from '@samrey/runtime';

export interface ButtonProps {
  id?: string;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean | (() => boolean);
  loading?: boolean | (() => boolean);
  onClick?: (e: MouseEvent) => void;
  ariaLabel?: string;
  class?: string;
  children?: any[];
}

export function Button(props: ButtonProps, ...children: any[]): HTMLButtonElement {
  const variant = props.variant || 'primary';
  const size = props.size || 'md';

  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5'
  }[size];

  const variantStyles = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900 shadow-xs border border-transparent',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400 border border-slate-200',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-xs border border-transparent',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-400',
    outline: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 focus:ring-slate-400 shadow-xs'
  }[variant];

  const customClass = props.class ? ` ${props.class}` : '';
  const combinedClass = `${baseStyles} ${sizeStyles} ${variantStyles}${customClass}`;

  const allChildren = children.length > 0 ? children : props.children || [];

  const buttonAttrs: Record<string, any> = {
    type: props.type || 'button',
    class: combinedClass
  };

  if (props.id) buttonAttrs.id = props.id;
  if (props.ariaLabel) buttonAttrs['aria-label'] = props.ariaLabel;
  if (props.disabled !== undefined) buttonAttrs.disabled = props.disabled;
  if (props.onClick) buttonAttrs.onClick = props.onClick;

  return el('button', buttonAttrs, ...allChildren);
}
