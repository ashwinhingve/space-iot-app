'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { motion } from 'framer-motion';
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
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

// Define TypeScript interfaces for documentation content
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 100
    }
  }
};

// Documentation sections
const sections: Section[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: <Book className="h-5 w-5" />,
    content: [
      {
        title: "Introduction",
        description: "IoT Space is a comprehensive platform for managing and monitoring IoT devices. This documentation will help you understand how to use the platform effectively.",
        steps: [
          "Create an account or log in to your existing account",
          "Add your first IoT device through the dashboard",
          "Connect your device using our provided libraries",
          "Start monitoring and controlling your devices"
        ]
      },
      {
        title: "System Requirements",
        description: "IoT Space is a cloud-based platform that can be accessed from any modern web browser.",
        list: [
          "Chrome 80+",
          "Firefox 75+",
          "Safari 13.1+",
          "Edge 80+",
          "Stable internet connection"
        ]
      }
    ]
  },
  {
    id: "devices",
    title: "Device Management",
    icon: <MonitorSmartphone className="h-5 w-5" />,
    content: [
      {
        title: "Adding Devices",
        description: "You can add various types of IoT devices to your account including sensors, switches, and more.",
        steps: [
          "Navigate to the Dashboard",
          "Click on 'Add Device' button",
          "Select your device type from the dropdown",
          "Enter a unique name for your device",
          "Provide the MQTT topic for your device",
          "Click 'Save' to create the device"
        ]
      },
      {
        title: "Device Types",
        description: "IoT Space supports various device types for different use cases:",
        list: [
          "Switch - Toggle devices like lights or outlets",
          "Slider - Control variable settings like dimmers",
          "Sensor - Monitor environmental data",
          "Chart - Visualize trends over time",
          "Button - Trigger specific actions",
          "Value Display - Show numeric readings"
        ]
      }
    ]
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: <Server className="h-5 w-5" />,
    content: [
      {
        title: "Dashboard Overview",
        description: "The dashboard is your central hub for monitoring and controlling all your IoT devices.",
        features: [
          "Real-time device status (online/offline)",
          "Latest sensor readings",
          "Device controls for interactive devices",
          "Customizable widget layout",
          "Data visualization options"
        ]
      },
      {
        title: "Widgets",
        description: "You can customize your dashboard with different widgets to visualize your IoT data.",
        steps: [
          "Drag widgets from the widget box to your dashboard",
          "Arrange them in the desired layout",
          "Configure widget settings by clicking the gear icon",
          "Remove widgets by clicking the X button"
        ]
      }
    ]
  },
  {
    id: "api",
    title: "API Reference",
    icon: <Command className="h-5 w-5" />,
    content: [
      {
        title: "REST API",
        description: "IoT Space provides a comprehensive REST API for programmatic device management.",
        endpoints: [
          { method: "GET", path: "/api/devices", desc: "Retrieve all devices" },
          { method: "POST", path: "/api/devices", desc: "Create a new device" },
          { method: "GET", path: "/api/devices/:id", desc: "Get specific device details" },
          { method: "PUT", path: "/api/devices/:id", desc: "Update device information" },
          { method: "DELETE", path: "/api/devices/:id", desc: "Delete a device" },
          { method: "POST", path: "/api/devices/:id/control", desc: "Control a device" }
        ]
      },
      {
        title: "MQTT Topics",
        description: "The platform uses standardized MQTT topics for device communication.",
        topics: [
          { topic: "devices/{device_id}/data", desc: "Receive data from a device" },
          { topic: "devices/{device_id}/status", desc: "Device status updates" },
          { topic: "devices/{device_id}/control", desc: "Send control commands to a device" },
          { topic: "devices/{device_id}/online", desc: "Device connection status" }
        ]
      }
    ]
  },
  {
    id: "security",
    title: "Security",
    icon: <Lock className="h-5 w-5" />,
    content: [
      {
        title: "Authentication",
        description: "IoT Space uses secure authentication methods to protect your account and devices.",
        features: [
          "JWT-based authentication",
          "Secure password policies",
          "Session management",
          "Optional two-factor authentication"
        ]
      },
      {
        title: "Device Security",
        description: "All communication with devices is encrypted and secured.",
        features: [
          "TLS/SSL encryption for all data transmission",
          "Unique device identifiers",
          "Access control for device management",
          "Regular security audits and updates"
        ]
      }
    ]
  }
];

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [expandedFaqs, setExpandedFaqs] = useState<string[]>([]);

  // Sample FAQs
  const faqs: Faq[] = [
    {
      id: "faq-1",
      question: "How do I connect my device to the platform?",
      answer: "To connect your device, first add it to your dashboard using the 'Add Device' button. Then use our device libraries (available for Arduino, ESP32, Raspberry Pi, etc.) to establish the connection using the provided MQTT credentials."
    },
    {
      id: "faq-2",
      question: "Is my data secure on IoT Space?",
      answer: "Yes, your data is secured with industry-standard encryption both in transit and at rest. We use TLS for all communications and implement strict access controls to protect your information."
    },
    {
      id: "faq-3",
      question: "How many devices can I connect?",
      answer: "The number of devices depends on your subscription plan. Free accounts can connect up to 3 devices, while paid plans allow for more connections according to your subscription level."
    },
    {
      id: "faq-4",
      question: "Can I access my devices when I'm offline?",
      answer: "The web interface requires an internet connection to access your devices. However, you can implement local fallback in your device firmware to maintain basic functionality when cloud connectivity is lost."
    },
    {
      id: "faq-5",
      question: "How do I create custom dashboards?",
      answer: "Navigate to the Dashboard page and use the Widget Box to drag and drop various widgets onto your dashboard. You can then arrange and customize them according to your needs."
    }
  ];

  const toggleFaq = (id: string) => {
    setExpandedFaqs(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Filter sections based on search query
  const filteredSections = searchQuery
    ? sections.filter(section => 
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.content.some(item => 
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      )
    : sections;

  return (
    <MainLayout>
      <div className="container mx-auto py-10">
        <motion.div 
          className="mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold mb-4">Documentation</h1>
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
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input 
              placeholder="Search documentation..." 
              className="pl-10" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Sidebar navigation */}
          <motion.div 
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="sticky top-24 space-y-1">
              {filteredSections.map((section) => (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection(section.id)}
                >
                  <span className="mr-2">{section.icon}</span>
                  {section.title}
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Main content */}
          <motion.div 
            className="lg:col-span-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredSections.map((section) => (
              <div 
                key={section.id} 
                className={activeSection === section.id ? "block" : "hidden"}
              >
                <motion.h2 
                  className="text-3xl font-bold mb-6" 
                  variants={itemVariants}
                >
                  {section.title}
                </motion.h2>
                
                {section.content.map((item, index) => (
                  <motion.div 
                    key={index} 
                    className="mb-10" 
                    variants={itemVariants}
                  >
                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                    {item.description && (
                      <p className="text-muted-foreground mb-4">{item.description}</p>
                    )}
                    
                    {/* Render steps if present */}
                    {item.steps && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Steps:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                          {item.steps.map((step, i) => (
                            <li key={i} className="text-foreground">{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    
                    {/* Render list if present */}
                    {item.list && (
                      <div className="mt-4">
                        <ul className="list-disc pl-5 space-y-2">
                          {item.list.map((listItem, i) => (
                            <li key={i} className="text-foreground">{listItem}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Render features if present */}
                    {item.features && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Features:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                          {item.features.map((feature, i) => (
                            <li key={i} className="text-foreground">{feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Render API endpoints if present */}
                    {item.endpoints && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">API Endpoints:</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full border border-border rounded-md">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-4 py-2 text-left">Method</th>
                                <th className="px-4 py-2 text-left">Endpoint</th>
                                <th className="px-4 py-2 text-left">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {item.endpoints.map((endpoint, i) => (
                                <tr key={i}>
                                  <td className="px-4 py-2">
                                    <span className={`inline-block px-2 py-1 text-xs rounded ${
                                      endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 
                                      endpoint.method === 'POST' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 
                                      endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : 
                                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                    }`}>
                                      {endpoint.method}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 font-mono text-sm">{endpoint.path}</td>
                                  <td className="px-4 py-2">{endpoint.desc}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {/* Render MQTT topics if present */}
                    {item.topics && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">MQTT Topics:</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full border border-border rounded-md">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-4 py-2 text-left">Topic</th>
                                <th className="px-4 py-2 text-left">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {item.topics.map((topic, i) => (
                                <tr key={i}>
                                  <td className="px-4 py-2 font-mono text-sm">{topic.topic}</td>
                                  <td className="px-4 py-2">{topic.desc}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ))}

            {/* FAQ Section - shown when activeSection is empty or no sections match search */}
            {(filteredSections.length === 0 || activeSection === 'faq') && (
              <motion.div variants={containerVariants}>
                <motion.h2 
                  className="text-3xl font-bold mb-6" 
                  variants={itemVariants}
                >
                  Frequently Asked Questions
                </motion.h2>
                
                <motion.div className="space-y-4" variants={itemVariants}>
                  {faqs.map(faq => (
                    <div 
                      key={faq.id} 
                      className="border border-border rounded-md overflow-hidden"
                    >
                      <button 
                        className="flex justify-between items-center w-full px-4 py-3 text-left"
                        onClick={() => toggleFaq(faq.id)}
                      >
                        <span className="font-medium">{faq.question}</span>
                        <ChevronDown className={`h-5 w-5 transition-transform ${
                          expandedFaqs.includes(faq.id) ? 'transform rotate-180' : ''
                        }`} />
                      </button>
                      {expandedFaqs.includes(faq.id) && (
                        <div className="px-4 py-3 bg-muted/50 border-t border-border">
                          <p className="text-muted-foreground">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* Quick links to additional resources */}
            <motion.div 
              className="mt-16 pt-8 border-t border-border"
              variants={containerVariants}
            >
              <motion.h3 
                className="text-xl font-semibold mb-6" 
                variants={itemVariants}
              >
                Additional Resources
              </motion.h3>
              
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                variants={itemVariants}
              >
                <Link href="#" className="block p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors">
                  <Cloud className="h-8 w-8 mb-2 text-blue-500" />
                  <h4 className="font-medium">Cloud Integration</h4>
                  <p className="text-sm text-muted-foreground">Connect with AWS, Azure and Google Cloud</p>
                </Link>
                
                <Link href="#" className="block p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors">
                  <Share2 className="h-8 w-8 mb-2 text-purple-500" />
                  <h4 className="font-medium">Community</h4>
                  <p className="text-sm text-muted-foreground">Join our forums and Discord</p>
                </Link>
                
                <Link href="#" className="block p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors">
                  <HelpCircle className="h-8 w-8 mb-2 text-green-500" />
                  <h4 className="font-medium">Support</h4>
                  <p className="text-sm text-muted-foreground">Get help from our team</p>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
} 