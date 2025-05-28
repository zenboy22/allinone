'use client';

import React, { createContext, useContext, useState } from 'react';

export const VALID_MENUS = [
  'services',
  'addons',
  'filters',
  'sorting',
  'miscellaneous',
  'save-install',
  'about',
  'formatter',
  'load-config',
  'unload-config',
];

export type MenuId = (typeof VALID_MENUS)[number];

type MenuContextType = {
  selectedMenu: MenuId;
  setSelectedMenu: (menu: MenuId) => void;
};

const MenuContext = createContext<MenuContextType>({
  selectedMenu: 'about',
  setSelectedMenu: () => {},
});

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [selectedMenu, setSelectedMenu] = useState<MenuId>('about');

  return (
    <MenuContext.Provider value={{ selectedMenu, setSelectedMenu }}>
      {children}
    </MenuContext.Provider>
  );
}

export const useMenu = () => useContext(MenuContext);
