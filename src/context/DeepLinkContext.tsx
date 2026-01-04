import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Observation } from '../types/observation';

interface DeepLinkContextType {
  deepLinkedObservation: Observation | null;
  setDeepLinkedObservation: (observation: Observation | null) => void;
}

const DeepLinkContext = createContext<DeepLinkContextType | undefined>(undefined);

export function DeepLinkProvider({ children }: { children: ReactNode }) {
  const [deepLinkedObservation, setDeepLinkedObservation] = useState<Observation | null>(null);

  return (
    <DeepLinkContext.Provider value={{ deepLinkedObservation, setDeepLinkedObservation }}>
      {children}
    </DeepLinkContext.Provider>
  );
}

export function useDeepLink() {
  const context = useContext(DeepLinkContext);
  if (context === undefined) {
    throw new Error('useDeepLink must be used within a DeepLinkProvider');
  }
  return context;
}

