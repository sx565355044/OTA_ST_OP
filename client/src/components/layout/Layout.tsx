import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

export const Layout = ({ children, title }: LayoutProps) => {
  const isMobile = useMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100 text-neutral-500">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
