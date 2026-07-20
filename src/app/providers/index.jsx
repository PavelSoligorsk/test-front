import React from 'react';

export function AppProviders({ children }) {
  return (
    <React.StrictMode>
      {children}
    </React.StrictMode>
  );
}
