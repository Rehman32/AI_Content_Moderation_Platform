'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../features/auth/context/AuthContext';
import { LoadingScreen } from '../components/ui-custom/LoadingScreen';

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role === 'ADMIN') {
      router.push('/admin');
    } else {
      router.push('/submissions');
    }
  }, [isLoading, isAuthenticated, user, router]);

  return <LoadingScreen fullScreen message="Initializing application..." />;
}
