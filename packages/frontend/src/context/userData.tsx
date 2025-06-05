import React from 'react';
import { UserData } from '@aiostreams/core';
import { QUALITIES, RESOLUTIONS } from '../../../core/src/utils/constants';

const DefaultUserData: UserData = {
  presets: [],
  formatter: {
    id: 'gdrive',
  },
  preferredQualities: Object.values(QUALITIES),
  preferredResolutions: Object.values(RESOLUTIONS),
  excludedQualities: ['CAM', 'SCR', 'TS', 'TC'],
  excludedVisualTags: ['3D'],
  sortCriteria: {
    global: [
      {
        key: 'cached',
        direction: 'desc',
      },
      {
        key: 'library',
        direction: 'desc',
      },
      {
        key: 'resolution',
        direction: 'desc',
      },
      {
        key: 'size',
        direction: 'desc',
      },
    ],
  },
  deduplicator: {
    enabled: false,
    keys: ['filename', 'infoHash'],
    cached: 'single_result',
    uncached: 'per_service',
    p2p: 'single_result',
  },
};

interface UserDataContextType {
  userData: UserData;
  setUserData: (
    data: UserData | null | ((prev: UserData) => UserData | null)
  ) => void;
  uuid: string | null;
  setUuid: (uuid: string | null) => void;
  password: string | null;
  setPassword: (password: string | null) => void;
  encryptedPassword: string | null;
  setEncryptedPassword: (encryptedPassword: string | null) => void;
}

const UserDataContext = React.createContext<UserDataContextType | undefined>(
  undefined
);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = React.useState<UserData>(DefaultUserData);
  const [uuid, setUuid] = React.useState<string | null>(null);
  const [password, setPassword] = React.useState<string | null>(null);
  const [encryptedPassword, setEncryptedPassword] = React.useState<
    string | null
  >(null);

  const safeSetUserData = (
    data: UserData | null | ((prev: UserData) => UserData | null)
  ) => {
    if (typeof data === 'function') {
      setUserData((prev) => {
        const result = (data as (prev: UserData) => UserData | null)(prev);
        return result === null ? DefaultUserData : result;
      });
    } else if (data === null) {
      setUserData(DefaultUserData);
    } else {
      setUserData(data);
    }
  };

  return (
    <UserDataContext.Provider
      value={{
        userData,
        setUserData: safeSetUserData,
        uuid,
        setUuid,
        password,
        setPassword,
        encryptedPassword,
        setEncryptedPassword,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const context = React.useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
}
