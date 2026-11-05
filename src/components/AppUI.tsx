'use client';
import { createContext, useContext, useEffect, useState } from 'react';
const Ctx = createContext(false);
/**
 * True on phones: the app-style screens are shown. Desktop and tablets keep the website layout.
 * `initial` comes from the server (phone browser or not) so there is no flash; the real screen width then takes over.
 */
export function AppUIProvider({ initial, children }: { initial: boolean; children: React.ReactNode }) {
  const [app, setApp] = useState(initial);
  useEffect(() => {
    const mq = matchMedia('(max-width: 767px)');
    const set = () => setApp(mq.matches);
    set(); mq.addEventListener('change', set);
    return () => mq.removeEventListener('change', set);
  }, []);
  return <Ctx.Provider value={app}>{children}</Ctx.Provider>;
}
export const useAppUI = () => useContext(Ctx);
