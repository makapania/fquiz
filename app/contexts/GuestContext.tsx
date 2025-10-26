"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface GuestContextType {
  guestCodename: string | null;
  isGuest: boolean;
  claimCodename: () => Promise<void>;
  releaseCodename: () => Promise<void>;
  loading: boolean;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [guestCodename, setGuestCodename] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load codename from localStorage on mount
  useEffect(() => {
    const savedCodename = localStorage.getItem('guest_codename');
    if (savedCodename) {
      setGuestCodename(savedCodename);
    }
  }, []);

  const claimCodename = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/guest/claim-codename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to claim codename');
      }

      const { codename } = await response.json();
      setGuestCodename(codename);
      localStorage.setItem('guest_codename', codename);
    } catch (error) {
      console.error('Error claiming codename:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const releaseCodename = async () => {
    if (!guestCodename) return;

    try {
      const response = await fetch('/api/guest/release-codename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ codename: guestCodename }),
      });

      if (!response.ok) {
        console.warn('Failed to release codename on server');
      }
    } catch (error) {
      console.warn('Error releasing codename:', error);
    } finally {
      // Always clear local state
      setGuestCodename(null);
      localStorage.removeItem('guest_codename');
    }
  };

  // Release codename when the page is about to unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (guestCodename) {
        // Use sendBeacon for reliable cleanup on page unload
        navigator.sendBeacon('/api/guest/release-codename', JSON.stringify({ codename: guestCodename }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [guestCodename]);

  return (
    <GuestContext.Provider
      value={{
        guestCodename,
        isGuest: !!guestCodename,
        claimCodename,
        releaseCodename,
        loading,
      }}
    >
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
}