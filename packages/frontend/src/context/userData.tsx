import React from 'react';
import { UserData } from '@aiostreams/core';

const DefaultUserData: UserData = {
  addons: [],
  formatter: {
    id: 'gdrive',
  },
};

interface UserDataContextType {
  userData: UserData;
  setUserData: (data: UserData | null) => void;
  uuid: string | null;
  setUuid: (uuid: string | null) => void;
  password: string | null;
  setPassword: (password: string | null) => void;
}

const UserDataContext = React.createContext<UserDataContextType | undefined>(
  undefined
);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = React.useState<UserData>(DefaultUserData);
  const [uuid, setUuid] = React.useState<string | null>(null);
  const [password, setPassword] = React.useState<string | null>(null);

  const safeSetUserData = (data: UserData | null) => {
    if (data === null) {
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
