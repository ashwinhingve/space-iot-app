'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CommandAreaMapPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/oms'); }, [router]);
  return null;
}
