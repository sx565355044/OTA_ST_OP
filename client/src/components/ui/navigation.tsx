import * as React from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

interface NavItemProps {
  href: string;
  icon: string;
  children: React.ReactNode;
  active?: boolean;
}

export function NavItem({ href, icon, children, active }: NavItemProps) {
  const [location] = useLocation();
  const isActive = active !== undefined ? active : location === href;

  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer", 
          isActive 
            ? "bg-primary-50 text-primary-700" 
            : "text-gray-700 hover:bg-gray-50 hover:text-primary-700"
        )}
      >
        <span className={cn(
          "material-icons mr-3 text-lg",
          isActive ? "text-primary-500" : "text-gray-500"
        )}>
          {icon}
        </span>
        <span>{children}</span>
      </div>
    </Link>
  );
}

interface MobileNavItemProps {
  href: string;
  icon: string;
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}

export function MobileNavItem({ href, icon, children, onClick, active }: MobileNavItemProps) {
  const [location] = useLocation();
  const isActive = active !== undefined ? active : location === href;

  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer", 
          isActive 
            ? "bg-primary-50 text-primary-700" 
            : "text-gray-700 hover:bg-gray-50 hover:text-primary-700"
        )}
        onClick={onClick}
      >
        <span className={cn(
          "material-icons mr-3 text-lg",
          isActive ? "text-primary-500" : "text-gray-500"
        )}>
          {icon}
        </span>
        <span>{children}</span>
      </div>
    </Link>
  );
}
