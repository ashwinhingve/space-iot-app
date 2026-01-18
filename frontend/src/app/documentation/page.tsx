'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import AnimatedBackground from '@/components/AnimatedBackground';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Book,
  Server,
  MonitorSmartphone,
  Command,
  Lock,
  Cloud,
  Share2,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Search,
  Copy,
  Check,
  Sparkles,
  Code,
  Cpu,
  Zap,
  FileCode,
  GitBranch,
  Database,
  Workflow,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ApiEndpoint {
  method: string;
  path: string;
  desc: string;
}

interface MqttTopic {
  topic: string;
  desc: string;
}

interface ContentItem {
  title: string;
  description: string;
  steps?: string[];
  list?: string[];
  features?: string[];
  endpoints?: ApiEndpoint[];
  topics?: MqttTopic[];
  code?: { language: string; content: string };
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: ContentItem[];
}

interface Faq {
  id: string;
  question: string;
  answer: string;
}

const sections: Section[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Book className="h-5 w-5" />,
    content: [
      {
        title: 'Introduction',
        description:
          'IoT Space is a comprehensive platform for managing and monitoring IoT devices. This documentation will help you understand how to use the platform effectively.',
        steps: [
          'Create an account or log in to your existing account',
          'Add your first IoT device through the dashboard',
          'Connect your device using our provided libraries',
          'Start monitoring and controlling your devices',
        ],
      },
      {
        title: 'System Requirements',
        description:
          'IoT Space is a cloud-based platform that can be accessed from any modern web browser.',
        list: [
          'Chrome 80+',
          'Firefox 75+',
          'Safari 13.1+',
          'Edge 80+',
          'Stable internet connection',
        ],
      },
      {
        title: 'Quick Start',
        description: 'Get up and running in minutes with this quick start guide.',
        code: {
          language: 'bash',
          content: `# Clone the repository
git clone https://github.com/your-repo/space-iot-app.git

# Install dependencies
cd space-iot-app/backend && npm install
cd ../frontend && npm install

# Start the development servers
npm run dev`,
        },
      },
    ],
  },
  {
    id: 'devices',
    title: 'Device Management',
    icon: <MonitorSmartphone className="h-5 w-5" />,
    content: [
      {
        title: 'Adding Devices',
        description:
          'You can add various types of IoT devices to your account including sensors, switches, and more.',
        steps: [
          "Navigate to the Devices page from the sidebar",
          "Click on 'Add Device' button",
          'Select your device type from the dropdown',
          'Enter a unique name for your device',
          'Provide the MQTT topic for your device',
          "Click 'Add Device' to create the device",
        ],
      },
      {
        title: 'Device Types',
        description: 'IoT Space supports various device types for different use cases:',
        list: [
          'Switch - Toggle devices like lights or outlets',
          'Slider - Control variable settings like dimmers',
          'Sensor - Monitor environmental data',
          'Chart - Visualize trends over time',
          'Button - Trigger specific actions',
          'Value Display - Show numeric readings',
        ],
      },
      {
        title: 'ESP32 Integration',
        description: 'Connect your ESP32 device using our Arduino library:',
        code: {
          language: 'cpp',
          content: `#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "your-wifi-ssid";
const char* password = "your-wifi-password";
const char* mqtt_server = "your-mqtt-broker";
const char* deviceId = "esp32-001";

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // Publish sensor data
  String topic = "devices/" + String(deviceId) + "/data";
  client.publish(topic.c_str(), "{\\"value\\": 25.5}");
  delay(5000);
}`,
        },
      },
    ],
  },
  {
    id: 'manifolds',
    title: 'Manifold Systems',
    icon: <Workflow className="h-5 w-5" />,
    content: [
      {
        title: 'Understanding Manifolds',
        description:
          'Manifolds are 4-valve irrigation systems that can be controlled and monitored through the platform.',
        features: [
          'Control up to 4 valves per manifold',
          'Real-time status monitoring',
          '3D visualization of manifold state',
          'Scheduling and automation support',
          'Historical data tracking',
        ],
      },
      {
        title: 'Creating a Manifold',
        description: 'Set up a new manifold system in your account:',
        steps: [
          'Navigate to the Manifolds page',
          "Click 'Create Manifold'",
          'Enter manifold name and identifier',
          'Configure installation details (location, date)',
          'Set up valve specifications',
          'Save and start monitoring',
        ],
      },
      {
        title: 'Valve Control',
        description: 'Control individual valves through the API or dashboard:',
        code: {
          language: 'javascript',
          content: `// Send valve command via API
const response = await fetch('/api/manifolds/:id/valve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    valve: 1,        // Valve number (1-4)
    action: 'open'   // 'open' or 'close'
  })
});`,
        },
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: <Server className="h-5 w-5" />,
    content: [
      {
        title: 'Dashboard Overview',
        description:
          'The dashboard is your central hub for monitoring and controlling all your IoT devices.',
        features: [
          'Real-time device status (online/offline)',
          'System health monitoring',
          'Active alerts and notifications',
          'Analytics and data visualization',
          'Quick access to all devices and manifolds',
        ],
      },
      {
        title: 'Stats Cards',
        description:
          'The dashboard displays key metrics at a glance:',
        list: [
          'Devices Online - Number of connected devices',
          'Active Manifolds - Manifolds currently operating',
          'Valves Running - Total active valves',
          'Active Alerts - Issues requiring attention',
        ],
      },
      {
        title: 'Real-time Updates',
        description:
          'The dashboard uses WebSocket connections for real-time data updates. All device status changes and sensor readings are reflected immediately without page refresh.',
        features: [
          'Live connection status indicator',
          'Automatic reconnection on network issues',
          'Push notifications for critical alerts',
          'Background data synchronization',
        ],
      },
    ],
  },
  {
    id: 'api',
    title: 'API Reference',
    icon: <Command className="h-5 w-5" />,
    content: [
      {
        title: 'REST API',
        description:
          'IoT Space provides a comprehensive REST API for programmatic device management.',
        endpoints: [
          { method: 'GET', path: '/api/devices', desc: 'Retrieve all devices' },
          { method: 'POST', path: '/api/devices', desc: 'Create a new device' },
          { method: 'GET', path: '/api/devices/:id', desc: 'Get specific device details' },
          { method: 'PUT', path: '/api/devices/:id', desc: 'Update device information' },
          { method: 'DELETE', path: '/api/devices/:id', desc: 'Delete a device' },
          { method: 'POST', path: '/api/devices/:id/control', desc: 'Control a device' },
        ],
      },
      {
        title: 'Manifold API',
        description: 'Endpoints for managing manifold systems:',
        endpoints: [
          { method: 'GET', path: '/api/manifolds', desc: 'List all manifolds' },
          { method: 'POST', path: '/api/manifolds', desc: 'Create a new manifold' },
          { method: 'GET', path: '/api/manifolds/:id', desc: 'Get manifold details' },
          { method: 'POST', path: '/api/manifolds/:id/valve', desc: 'Control a valve' },
          { method: 'PUT', path: '/api/manifolds/:id/status', desc: 'Update manifold status' },
        ],
      },
      {
        title: 'MQTT Topics',
        description: 'The platform uses standardized MQTT topics for device communication.',
        topics: [
          { topic: 'devices/{device_id}/data', desc: 'Receive data from a device' },
          { topic: 'devices/{device_id}/status', desc: 'Device status updates' },
          { topic: 'devices/{device_id}/control', desc: 'Send control commands to a device' },
          { topic: 'devices/{device_id}/online', desc: 'Device connection status' },
          { topic: 'manifolds/{manifold_id}/valve/{n}', desc: 'Valve control commands' },
        ],
      },
      {
        title: 'Authentication',
        description: 'All API requests require authentication via JWT token:',
        code: {
          language: 'javascript',
          content: `// Login to get JWT token
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'your-password'
  })
});
const { token } = await loginResponse.json();

// Use token in subsequent requests
const devicesResponse = await fetch('/api/devices', {
  headers: {
    'Authorization': \`Bearer \${token}\`
  }
});`,
        },
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    icon: <Lock className="h-5 w-5" />,
    content: [
      {
        title: 'Authentication',
        description:
          'IoT Space uses secure authentication methods to protect your account and devices.',
        features: [
          'JWT-based authentication with secure token storage',
          'Password hashing with bcrypt',
          'Session management and automatic expiration',
          'Google OAuth integration',
          'Rate limiting on authentication endpoints',
        ],
      },
      {
        title: 'Device Security',
        description: 'All communication with devices is encrypted and secured.',
        features: [
          'TLS/SSL encryption for all data transmission',
          'Unique device identifiers and API keys',
          'Access control for device management',
          'MQTT authentication and authorization',
          'Regular security audits and updates',
        ],
      },
      {
        title: 'Best Practices',
        description: 'Follow these security best practices:',
        list: [
          'Use strong, unique passwords for your account',
          'Never share your API keys or tokens',
          'Regularly rotate device credentials',
          'Monitor your devices for unusual activity',
          'Keep your firmware and libraries updated',
        ],
      },
    ],
  },
];

const faqs: Faq[] = [
  {
    id: 'faq-1',
    question: 'How do I connect my device to the platform?',
    answer:
      "To connect your device, first add it to your dashboard using the 'Add Device' button. Then use our device libraries (available for Arduino, ESP32, Raspberry Pi, etc.) to establish the connection using the provided MQTT credentials.",
  },
  {
    id: 'faq-2',
    question: 'Is my data secure on IoT Space?',
    answer:
      'Yes, your data is secured with industry-standard encryption both in transit and at rest. We use TLS for all communications and implement strict access controls to protect your information.',
  },
  {
    id: 'faq-3',
    question: 'How many devices can I connect?',
    answer:
      'The number of devices depends on your subscription plan. Free accounts can connect up to 3 devices, while paid plans allow for more connections according to your subscription level.',
  },
  {
    id: 'faq-4',
    question: 'Can I access my devices when I\'m offline?',
    answer:
      'The web interface requires an internet connection to access your devices. However, you can implement local fallback in your device firmware to maintain basic functionality when cloud connectivity is lost.',
  },
  {
    id: 'faq-5',
    question: 'How do manifolds differ from regular devices?',
    answer:
      'Manifolds are specialized 4-valve irrigation systems with dedicated management features including 3D visualization, valve scheduling, and agricultural-specific monitoring capabilities.',
  },
];

function CodeBlock({ language, content }: { language: string; content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group mt-4">
      <div className="absolute right-2 top-2 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <div className="rounded-xl overflow-hidden border border-border/50 bg-zinc-950">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-zinc-900">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-muted-foreground ml-2">{language}</span>
        </div>
        <pre className="p-4 overflow-x-auto text-sm">
          <code className="text-zinc-300">{content}</code>
        </pre>
      </div>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    POST: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    PUT: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-mono font-medium rounded-md border ${
        colors[method] || 'bg-secondary text-secondary-foreground'
      }`}
    >
      {method}
    </span>
  );
}

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [expandedFaqs, setExpandedFaqs] = useState<string[]>([]);

  const toggleFaq = (id: string) => {
    setExpandedFaqs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredSections = searchQuery
    ? sections.filter(
        (section) =>
          section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          section.content.some(
            (item) =>
              item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
          )
      )
    : sections;

  return (
    <MainLayout>
      <div className="relative min-h-screen">
        <AnimatedBackground variant="subtle" showParticles={true} showGradientOrbs={true} />

        <div className="relative z-10 container mx-auto py-10 px-4">
          {/* Header */}
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-brand-500/10 border border-brand-500/20 backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <FileCode className="h-4 w-4 text-brand-500" />
              <span className="text-sm font-medium text-brand-600 dark:text-brand-400">
                Developer Resources
              </span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground">
              Documentation
            </h1>
            <p className="text-muted-foreground text-lg max-w-3xl">
              Explore our comprehensive guides and references to get the most out of IoT Space.
            </p>
          </motion.div>

          {/* Search bar */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="relative max-w-xl group">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500/20 to-purple-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  className="w-full pl-12 pr-4 py-3 border border-border/50 rounded-xl bg-background/50 backdrop-blur-sm focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all duration-300 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar navigation */}
            <motion.div
              className="lg:col-span-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="sticky top-24 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
                  Sections
                </p>
                {filteredSections.map((section) => (
                  <motion.button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      activeSection === section.id
                        ? 'bg-gradient-to-r from-brand-500/10 to-purple-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span
                      className={
                        activeSection === section.id
                          ? 'text-brand-500'
                          : 'text-muted-foreground'
                      }
                    >
                      {section.icon}
                    </span>
                    {section.title}
                    {activeSection === section.id && (
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    )}
                  </motion.button>
                ))}

                {/* FAQ Link */}
                <motion.button
                  onClick={() => setActiveSection('faq')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeSection === 'faq'
                      ? 'bg-gradient-to-r from-brand-500/10 to-purple-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <HelpCircle
                    className={`h-5 w-5 ${
                      activeSection === 'faq' ? 'text-brand-500' : ''
                    }`}
                  />
                  FAQ
                  {activeSection === 'faq' && <ChevronRight className="h-4 w-4 ml-auto" />}
                </motion.button>
              </div>
            </motion.div>

            {/* Main content */}
            <motion.div
              className="lg:col-span-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <AnimatePresence mode="wait">
                {filteredSections.map(
                  (section) =>
                    activeSection === section.id && (
                      <motion.div
                        key={section.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                          <span className="p-2 bg-gradient-to-br from-brand-500/10 to-purple-500/10 rounded-xl border border-brand-500/20">
                            {section.icon}
                          </span>
                          {section.title}
                        </h2>

                        {section.content.map((item, index) => (
                          <motion.div
                            key={index}
                            className="mb-10 p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-brand-500/20 transition-colors"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <h3 className="text-xl font-semibold mb-3 text-foreground">
                              {item.title}
                            </h3>
                            {item.description && (
                              <p className="text-muted-foreground mb-4 leading-relaxed">
                                {item.description}
                              </p>
                            )}

                            {item.steps && (
                              <div className="mt-4">
                                <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wider">
                                  Steps
                                </h4>
                                <ol className="space-y-2">
                                  {item.steps.map((step, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 text-sm font-medium flex items-center justify-center">
                                        {i + 1}
                                      </span>
                                      <span className="text-foreground pt-0.5">{step}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}

                            {item.list && (
                              <div className="mt-4">
                                <ul className="space-y-2">
                                  {item.list.map((listItem, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-500 mt-2" />
                                      <span className="text-foreground">{listItem}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {item.features && (
                              <div className="mt-4">
                                <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wider">
                                  Features
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {item.features.map((feature, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30"
                                    >
                                      <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                      <span className="text-sm">{feature}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {item.endpoints && (
                              <div className="mt-4 overflow-x-auto">
                                <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wider">
                                  Endpoints
                                </h4>
                                <div className="rounded-xl border border-border/50 overflow-hidden">
                                  <table className="min-w-full">
                                    <thead className="bg-secondary/50">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                          Method
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                          Endpoint
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                          Description
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                      {item.endpoints.map((endpoint, i) => (
                                        <tr key={i} className="hover:bg-secondary/30 transition-colors">
                                          <td className="px-4 py-3">
                                            <MethodBadge method={endpoint.method} />
                                          </td>
                                          <td className="px-4 py-3 font-mono text-sm text-brand-500">
                                            {endpoint.path}
                                          </td>
                                          <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {endpoint.desc}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {item.topics && (
                              <div className="mt-4 overflow-x-auto">
                                <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wider">
                                  Topics
                                </h4>
                                <div className="rounded-xl border border-border/50 overflow-hidden">
                                  <table className="min-w-full">
                                    <thead className="bg-secondary/50">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                          Topic
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                          Description
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                      {item.topics.map((topic, i) => (
                                        <tr key={i} className="hover:bg-secondary/30 transition-colors">
                                          <td className="px-4 py-3 font-mono text-sm text-purple-500">
                                            {topic.topic}
                                          </td>
                                          <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {topic.desc}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {item.code && (
                              <CodeBlock language={item.code.language} content={item.code.content} />
                            )}
                          </motion.div>
                        ))}
                      </motion.div>
                    )
                )}

                {/* FAQ Section */}
                {activeSection === 'faq' && (
                  <motion.div
                    key="faq"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                      <span className="p-2 bg-gradient-to-br from-brand-500/10 to-purple-500/10 rounded-xl border border-brand-500/20">
                        <HelpCircle className="h-5 w-5" />
                      </span>
                      Frequently Asked Questions
                    </h2>

                    <div className="space-y-4">
                      {faqs.map((faq, index) => (
                        <motion.div
                          key={faq.id}
                          className="rounded-2xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <button
                            className="flex justify-between items-center w-full px-6 py-4 text-left hover:bg-secondary/30 transition-colors"
                            onClick={() => toggleFaq(faq.id)}
                          >
                            <span className="font-medium pr-4">{faq.question}</span>
                            <motion.div
                              animate={{ rotate: expandedFaqs.includes(faq.id) ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            </motion.div>
                          </button>
                          <AnimatePresence>
                            {expandedFaqs.includes(faq.id) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-6 py-4 bg-secondary/20 border-t border-border/50">
                                  <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick links */}
              <motion.div
                className="mt-16 pt-8 border-t border-border/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-brand-500" />
                  Additional Resources
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      icon: <GitBranch className="h-6 w-6" />,
                      title: 'GitHub Repository',
                      desc: 'View source code and contribute',
                      color: 'text-purple-500',
                      href: '#',
                    },
                    {
                      icon: <Share2 className="h-6 w-6" />,
                      title: 'Community',
                      desc: 'Join our forums and Discord',
                      color: 'text-blue-500',
                      href: '#',
                    },
                    {
                      icon: <HelpCircle className="h-6 w-6" />,
                      title: 'Support',
                      desc: 'Get help from our team',
                      color: 'text-emerald-500',
                      href: '#',
                    },
                  ].map((resource, index) => (
                    <motion.div
                      key={resource.title}
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link
                        href={resource.href}
                        className="group block p-5 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-brand-500/30 transition-all duration-300"
                      >
                        <div className={`${resource.color} mb-3`}>{resource.icon}</div>
                        <h4 className="font-medium flex items-center gap-2 group-hover:text-brand-500 transition-colors">
                          {resource.title}
                          <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">{resource.desc}</p>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
