'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createManifold } from '@/store/slices/manifoldSlice';
import { fetchDevices } from '@/store/slices/deviceSlice';
import { RootState, AppDispatch } from '@/store/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Factory,
  Cpu,
  Settings,
  MapPin,
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Basic Info', icon: Factory },
  { id: 2, title: 'Select Device', icon: Cpu },
  { id: 3, title: 'GPIO Configuration', icon: Settings },
  { id: 4, title: 'Review', icon: Check },
];

export default function CreateManifoldPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { devices } = useSelector((state: RootState) => state.devices);
  const { loading } = useSelector((state: RootState) => state.manifolds);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    latitude: 0,
    longitude: 0,
    installedBy: '',
    notes: '',
    esp32DeviceId: '',
    gpioPins: [12, 13, 14, 15],
    maxPressure: 150,
    maxFlowRate: 100,
  });

  useEffect(() => {
    dispatch(fetchDevices());
  }, [dispatch]);

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const result = await dispatch(
        createManifold({
          name: formData.name,
          esp32DeviceId: formData.esp32DeviceId,
          specifications: {
            maxPressure: formData.maxPressure,
            maxFlowRate: formData.maxFlowRate,
          },
          installationDetails: {
            location: formData.location,
            coordinates: {
              latitude: formData.latitude,
              longitude: formData.longitude,
            },
            installedBy: formData.installedBy,
            notes: formData.notes,
          },
          gpioPins: formData.gpioPins,
        })
      ).unwrap();

      router.push(`/manifolds/${result.manifold._id}`);
    } catch (error: any) {
      console.error('Failed to create manifold:', error);
      alert(error.message || 'Failed to create manifold');
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return formData.esp32DeviceId !== '';
      case 3:
        return (
          formData.gpioPins.length === 4 &&
          formData.gpioPins.every((pin) => pin >= 0 && pin <= 39)
        );
      default:
        return true;
    }
  };

  return (
    <MainLayout showFooter={false}>
      <div className="container py-10 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => router.push('/manifolds')}
          className="mb-6 hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Manifolds
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Create New Manifold</h1>
          <p className="text-muted-foreground">
            Configure your 4-valve irrigation manifold system
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : isCurrent
                          ? 'bg-brand-500 border-brand-500 text-white'
                          : 'bg-secondary border-border text-muted-foreground'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <p
                      className={`text-xs mt-2 ${
                        isCurrent ? 'font-semibold' : 'text-muted-foreground'
                      }`}
                    >
                      {step.title}
                    </p>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-border'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form Steps */}
        <Card className="p-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold mb-2">Basic Information</h2>
                  <p className="text-muted-foreground">
                    Provide details about your manifold system
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Manifold Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-3 border rounded-xl bg-background/50 backdrop-blur-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="e.g., Greenhouse A Manifold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      Installation Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="w-full px-4 py-3 border rounded-xl bg-background/50 backdrop-blur-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="e.g., Greenhouse A, Row 3"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={formData.latitude}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            latitude: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-4 py-3 border rounded-xl bg-background/50 backdrop-blur-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={formData.longitude}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            longitude: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-4 py-3 border rounded-xl bg-background/50 backdrop-blur-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="0.0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Installed By
                    </label>
                    <input
                      type="text"
                      value={formData.installedBy}
                      onChange={(e) =>
                        setFormData({ ...formData, installedBy: e.target.value })
                      }
                      className="w-full px-4 py-3 border rounded-xl bg-background/50 backdrop-blur-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Technician name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-3 border rounded-xl bg-background/50 backdrop-blur-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Select Device */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold mb-2">Select ESP32 Device</h2>
                  <p className="text-muted-foreground">
                    Choose the ESP32 device that will control this manifold
                  </p>
                </div>

                <div className="space-y-3">
                  {devices.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground mb-4">
                        No ESP32 devices found. Please register a device first.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => router.push('/devices')}
                      >
                        Go to Devices
                      </Button>
                    </div>
                  ) : (
                    devices.map((device: any) => (
                      <div
                        key={device._id}
                        onClick={() =>
                          setFormData({ ...formData, esp32DeviceId: device._id })
                        }
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          formData.esp32DeviceId === device._id
                            ? 'border-brand-500 bg-brand-500/10'
                            : 'border-border hover:border-brand-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{device.name}</h3>
                            <p className="text-sm text-muted-foreground font-mono">
                              {device.mqttTopic}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs ${
                                device.status === 'online'
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : 'bg-slate-500/10 text-slate-600'
                              }`}
                            >
                              {device.status}
                            </span>
                            {formData.esp32DeviceId === device._id && (
                              <Check className="h-5 w-5 text-brand-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: GPIO Configuration */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    GPIO Pin Configuration
                  </h2>
                  <p className="text-muted-foreground">
                    Assign GPIO pins for each valve (valid range: 0-39)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((valveNum, index) => (
                    <div key={valveNum}>
                      <label className="block text-sm font-semibold mb-2">
                        Valve {valveNum} - GPIO Pin
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="39"
                        value={formData.gpioPins[index]}
                        onChange={(e) => {
                          const newPins = [...formData.gpioPins];
                          newPins[index] = parseInt(e.target.value) || 0;
                          setFormData({ ...formData, gpioPins: newPins });
                        }}
                        className="w-full px-4 py-3 border rounded-xl bg-background/50 backdrop-blur-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                      />
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-brand-500/5 border border-brand-500/20 rounded-xl">
                  <p className="text-sm font-semibold mb-2">
                    Recommended GPIO Pins:
                  </p>
                  <p className="text-sm text-muted-foreground">
                    GPIO 12, 13, 14, 15 are commonly used for relay control. Avoid
                    GPIO 0, 2, 6-11, 34-39 (input only).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Max Pressure (PSI)
                    </label>
                    <input
                      type="number"
                      value={formData.maxPressure}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxPressure: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-3 border rounded-xl bg-background/50 backdrop-blur-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Max Flow Rate (GPM)
                    </label>
                    <input
                      type="number"
                      value={formData.maxFlowRate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxFlowRate: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-3 border rounded-xl bg-background/50 backdrop-blur-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold mb-2">Review & Confirm</h2>
                  <p className="text-muted-foreground">
                    Please review your configuration before creating the manifold
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-secondary/50 rounded-xl">
                    <h3 className="font-semibold mb-3">Basic Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{formData.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">
                          {formData.location || 'Not specified'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-secondary/50 rounded-xl">
                    <h3 className="font-semibold mb-3">ESP32 Device</h3>
                    <div className="text-sm">
                      <span className="font-medium">
                        {devices.find((d: any) => d._id === formData.esp32DeviceId)
                          ?.name || 'Not selected'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-secondary/50 rounded-xl">
                    <h3 className="font-semibold mb-3">GPIO Configuration</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {formData.gpioPins.map((pin, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-muted-foreground">
                            Valve {index + 1}:
                          </span>
                          <span className="font-mono font-medium">GPIO {pin}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-brand-500/5 border border-brand-500/20 rounded-xl">
                    <p className="text-sm">
                      <strong>Note:</strong> 4 valves will be automatically created
                      with the GPIO pins you configured. You can start controlling
                      them immediately after creation.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600 hover:shadow-glow text-white border-0"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-glow text-white border-0"
              >
                {loading ? 'Creating...' : 'Create Manifold'}
                <Check className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
