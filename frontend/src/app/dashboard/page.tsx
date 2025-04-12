'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MainLayout } from '@/components/MainLayout';
import { DeviceCard } from '@/components/DeviceCard';
import { fetchDevices } from '@/store/slices/deviceSlice';
import { RootState, AppDispatch } from '@/store/store';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Dashboard } from '@/components/Dashboard';

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { devices, loading } = useSelector((state: RootState) => state.devices);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(fetchDevices());
  }, [dispatch]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <MainLayout showFooter={false}>
      <div className="container py-10">
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Monitor and control your IoT devices
              </p>
            </div>
            <Button asChild>
              <Link href="/devices" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Device
              </Link>
            </Button>
          </div>

          {user && (
            <div className="bg-muted/50 p-4 rounded-lg mb-8">
              <p className="text-sm">
                Welcome back, <span className="font-medium">{user.name}</span>. 
                You have {devices.length} {devices.length === 1 ? 'device' : 'devices'} connected to your account.
              </p>
            </div>
          )}
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {devices.map((device) => (
              <motion.div key={device._id} variants={itemVariants}>
                <DeviceCard device={device} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && devices.length === 0 && (
          <motion.div 
            className="text-center py-16 bg-muted/30 rounded-lg border border-dashed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-lg font-medium mb-2">No devices found</h3>
            <p className="text-muted-foreground mb-6">
              Add your first device to get started
            </p>
            <Button asChild>
              <Link href="/devices" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Device
              </Link>
            </Button>
          </motion.div>
        )}

        <Dashboard />
      </div>
    </MainLayout>
  );
} 