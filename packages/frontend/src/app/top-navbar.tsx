// import { OfflineTopMenu } from '@/app/(main)/(offline)/offline/_components/offline-top-menu';
import { LayoutHeaderBackground } from '@/components/layout-header-background';
import { useStatus } from '@/context/status';
import { AppSidebarTrigger } from '@/components/ui/app-layout';
import { cn } from '@/components/ui/core/styling';

import React from 'react';
type TopNavbarProps = {
  children?: React.ReactNode;
};

export function TopNavbar(props: TopNavbarProps) {
  const { children, ...rest } = props;

  const serverStatus = useStatus();
  const isOffline = !serverStatus.status;

  return (
    <>
      <div
        data-top-navbar
        className={cn(
          'w-full h-[5rem] relative overflow-hidden flex items-center',
          'lg:hidden'
        )}
      >
        <div
          data-top-navbar-content-container
          className="relative z-10 px-4 w-full flex flex-row md:items-center overflow-x-auto"
        >
          <div
            data-top-navbar-content
            className="flex items-center w-full gap-3"
          >
            <AppSidebarTrigger />
            <div
              data-top-navbar-content-separator
              className="flex flex-1"
            ></div>
          </div>
        </div>
        <LayoutHeaderBackground />
      </div>
    </>
  );
}
