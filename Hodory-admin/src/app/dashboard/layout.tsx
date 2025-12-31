import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Next Shadcn Dashboard Starter',
  description: 'Basic dashboard with Next.js and Shadcn'
};

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <KBar>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <div className='min-h-0 flex-1 overflow-y-auto'>
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  );
}
