"use client";
import { SessionProvider } from "next-auth/react";
import { GuestProvider } from "../contexts/GuestContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GuestProvider>
        {children}
      </GuestProvider>
    </SessionProvider>
  );
}
