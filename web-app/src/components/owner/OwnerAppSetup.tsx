'use client';

import { useEffect } from 'react';

/** Registers the owner panel's service worker so phones offer to install it as an app. */
export default function OwnerAppSetup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/owner-sw.js', { scope: '/owner' }).catch(() => undefined);
  }, []);
  return null;
}
