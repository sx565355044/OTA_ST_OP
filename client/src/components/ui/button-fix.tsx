import React from 'react';
import { buttonVariants } from './button';
import { cn } from '@/lib/utils';

// 这是一个修复版本的按钮组件，确保文字始终可见
export interface ButtonFixProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  icon?: React.ReactNode;
}

export const ButtonFix = React.forwardRef<HTMLButtonElement, ButtonFixProps>(
  ({ className, variant = 'default', size = 'default', children, icon, ...props }, ref) => {
    // 根据变体选择适当的背景色和文字色
    const getButtonStyle = () => {
      switch(variant) {
        case 'default':
          return { backgroundColor: '#2563eb', color: 'white' };
        case 'destructive':
          return { backgroundColor: '#e11d48', color: 'white' };
        case 'outline':
          return { backgroundColor: 'transparent', color: '#374151', borderColor: '#d1d5db' };
        case 'secondary':
          return { backgroundColor: '#f3f4f6', color: '#374151' };
        case 'ghost':
          return { backgroundColor: 'transparent', color: '#374151' };
        case 'link':
          return { backgroundColor: 'transparent', color: '#2563eb', textDecoration: 'underline' };
        default:
          return { backgroundColor: '#2563eb', color: 'white' };
      }
    };

    return (
      <button
        className={cn(
          buttonVariants({ variant, size }), 
          'flex items-center justify-center',
          className
        )}
        ref={ref}
        style={getButtonStyle()}
        {...props}
      >
        {icon && <span className="mr-2">{icon}</span>}
        {children}
      </button>
    );
  }
);

ButtonFix.displayName = 'ButtonFix';