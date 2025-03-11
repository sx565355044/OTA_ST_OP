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
    // 根据变体选择适当的背景色和文字色（增强对比度）
    const getButtonStyle = () => {
      switch(variant) {
        case 'default':
          return { 
            backgroundColor: '#2563eb', 
            color: 'white',
            fontWeight: '500',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
          };
        case 'destructive':
          return { 
            backgroundColor: '#e11d48', 
            color: 'white',
            fontWeight: '500',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
          };
        case 'outline':
          return { 
            backgroundColor: 'transparent', 
            color: '#1e40af', 
            borderColor: '#93c5fd', 
            borderWidth: '1px',
            fontWeight: '500'
          };
        case 'secondary':
          return { 
            backgroundColor: '#dbeafe', 
            color: '#1e40af',
            fontWeight: '500' 
          };
        case 'ghost':
          return { 
            backgroundColor: 'transparent', 
            color: '#1e40af',
            fontWeight: '500'
          };
        case 'link':
          return { 
            backgroundColor: 'transparent', 
            color: '#2563eb', 
            textDecoration: 'underline',
            fontWeight: '500'
          };
        default:
          return { 
            backgroundColor: '#2563eb', 
            color: 'white',
            fontWeight: '500',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
          };
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