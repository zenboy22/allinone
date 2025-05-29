'use client';

import React from 'react';
import { AppSidebar, useAppSidebarContext } from '@/components/ui/app-layout';
import { cn } from '@/components/ui/core/styling';
import { VerticalMenu, VerticalMenuItem } from '@/components/ui/vertical-menu';
import { useStatus } from '@/context/status';
import { useMenu, MenuId, VALID_MENUS } from '@/context/menu';
import { useUserData } from '@/context/userData';
import { ConfigModal } from '@/components/config-modal';
import {
  BiPen,
  BiInfoCircle,
  BiCloud,
  BiExtension,
  BiFilterAlt,
  BiSave,
  BiSort,
  BiLogInCircle,
  BiLogOutCircle,
  BiCog,
  BiServer,
} from 'react-icons/bi';
import { useRouter, usePathname } from 'next/navigation';
import { useDisclosure } from '@/hooks/disclosure';
import {
  ConfirmationDialog,
  useConfirmationDialog,
} from '@/components/shared/confirmation-dialog';
import { Modal } from '@/components/ui/modal';
import { TextInput } from '@/components/ui/text-input';
import { toast } from 'sonner';

type MenuItem = VerticalMenuItem & {
  id: MenuId;
};

export function MainSidebar() {
  const ctx = useAppSidebarContext();
  const [expandedSidebar, setExpandSidebar] = React.useState(false);
  const isCollapsed = !ctx.isBelowBreakpoint && !expandedSidebar;
  const { selectedMenu, setSelectedMenu } = useMenu();
  const pathname = usePathname();

  const user = useUserData();
  const signInModal = useDisclosure(false);
  const [initialUuid, setInitialUuid] = React.useState<string | null>(null);

  React.useEffect(() => {
    const uuidMatch = pathname.match(
      /stremio\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/.*\/configure/
    );
    if (uuidMatch) {
      const extractedUuid = uuidMatch[1];
      setInitialUuid(extractedUuid);
      signInModal.open();
    }
    // check for menu query param
    const params = new URLSearchParams(window.location.search);
    const menu = params.get('menu');
    if (menu && VALID_MENUS.includes(menu)) {
      setSelectedMenu(menu);
    }
  }, [pathname]);

  const { status, error, loading } = useStatus();

  const confirmClearConfig = useConfirmationDialog({
    title: 'Sign Out',
    description: 'Are you sure you want to sign out?',
    onConfirm: () => {
      user.setUserData(null);
      user.setUuid(null);
      user.setPassword(null);
    },
  });

  const topMenuItems: MenuItem[] = [
    {
      name: 'About',
      iconType: BiInfoCircle,
      isCurrent: selectedMenu === 'about',
      id: 'about',
    },
    {
      name: 'Services',
      iconType: BiCloud,
      isCurrent: selectedMenu === 'services',
      id: 'services',
    },
    {
      name: 'Addons',
      iconType: BiExtension,
      isCurrent: selectedMenu === 'addons',
      id: 'addons',
    },
    {
      name: 'Filters',
      iconType: BiFilterAlt,
      isCurrent: selectedMenu === 'filters',
      id: 'filters',
    },
    {
      name: 'Sorting',
      iconType: BiSort,
      isCurrent: selectedMenu === 'sorting',
      id: 'sorting',
    },
    {
      name: 'Formatter',
      iconType: BiPen,
      isCurrent: selectedMenu === 'formatter',
      id: 'formatter',
    },
    {
      name: 'Proxy',
      iconType: BiServer,
      isCurrent: selectedMenu === 'proxy',
      id: 'proxy',
    },
    {
      name: 'Miscellaneous',
      iconType: BiCog,
      isCurrent: selectedMenu === 'miscellaneous',
      id: 'miscellaneous',
    },
    {
      name: 'Save & Install',
      iconType: BiSave,
      isCurrent: selectedMenu === 'save-install',
      id: 'save-install',
    },
  ];

  const bottomMenuItems: MenuItem[] = [
    ...(user.uuid && user.password
      ? [
          {
            name: 'Log Out',
            iconType: BiLogOutCircle,
            isCurrent: false,
            id: 'unload-config' as MenuId,
            onClick: () => {
              confirmClearConfig.open();
            },
          },
        ]
      : [
          {
            name: 'Log In',
            iconType: BiLogInCircle,
            isCurrent: signInModal.isOpen,
            id: 'sign-in' as MenuId,
            onClick: () => {
              signInModal.open();
            },
          },
        ]),
  ];

  const handleExpandSidebar = () => {
    if (!ctx.isBelowBreakpoint && ts.expandSidebarOnHover) {
      setExpandSidebar(true);
    }
  };
  const handleUnexpandedSidebar = () => {
    if (expandedSidebar && ts.expandSidebarOnHover) {
      setExpandSidebar(false);
    }
  };

  const ts = {
    expandSidebarOnHover: false,
    disableSidebarTransparency: false,
  };

  return (
    <>
      <AppSidebar
        className={cn(
          'group/main-sidebar h-full flex flex-col justify-between transition-gpu w-full transition-[width] duration-300',
          !ctx.isBelowBreakpoint && expandedSidebar && 'w-[260px]',
          !ctx.isBelowBreakpoint &&
            !ts.disableSidebarTransparency &&
            'bg-transparent',
          !ctx.isBelowBreakpoint &&
            !ts.disableSidebarTransparency &&
            ts.expandSidebarOnHover &&
            'hover:bg-[--background]'
        )}
        onMouseEnter={handleExpandSidebar}
        onMouseLeave={handleUnexpandedSidebar}
      >
        {!ctx.isBelowBreakpoint &&
          ts.expandSidebarOnHover &&
          ts.disableSidebarTransparency && (
            <div
              className={cn(
                'fixed h-full translate-x-0 w-[50px] bg-gradient bg-gradient-to-r via-[--background] from-[--background] to-transparent',
                'group-hover/main-sidebar:translate-x-[250px] transition opacity-0 duration-300 group-hover/main-sidebar:opacity-100'
              )}
            ></div>
          )}

        <div>
          <div className="mb-4 p-4 pb-0 flex flex-col items-center w-full">
            <img src="/logo.png" alt="logo" className="w-22.5 h-15" />
            <span className="text-xs text-gray-500">
              {status
                ? status.tag.includes('nightly')
                  ? 'nightly'
                  : status.tag
                : ''}
            </span>
          </div>
          <VerticalMenu
            className="px-4"
            collapsed={isCollapsed}
            itemClass="relative"
            items={topMenuItems}
            onItemSelect={(item) => {
              setSelectedMenu((item as MenuItem).id);
              ctx.setOpen(false);
            }}
          />
        </div>

        <div className="flex w-full gap-2 flex-col px-4">
          <div>
            <VerticalMenu
              collapsed={isCollapsed}
              itemClass="relative"
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
              onItemSelect={(item) => {
                const menuItem = item as MenuItem;
                if (menuItem.onClick) {
                  menuItem.onClick();
                } else {
                  setSelectedMenu(menuItem.id);
                  ctx.setOpen(false);
                }
              }}
              items={bottomMenuItems}
            />
          </div>
        </div>
      </AppSidebar>

      <ConfigModal
        open={signInModal.isOpen}
        onSuccess={() => {
          signInModal.close();
          toast.success('Signed in successfully');
        }}
        onOpenChange={(v) => {
          if (!v) {
            signInModal.close();
          }
        }}
        initialUuid={initialUuid || undefined}
      />

      <ConfirmationDialog {...confirmClearConfig} />
    </>
  );
}
