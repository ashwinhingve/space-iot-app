'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SldPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/scada'); }, [router]);
  return null;
}
