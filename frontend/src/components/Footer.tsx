'use client'

import Link from 'next/link'
import { Github, Mail, MessageSquare } from 'lucide-react'

const footerLinks = [
  {
    title: 'Product',
    links: [
      { name: 'Features', href: '/features' },
      { name: 'Use Cases', href: '/use-cases' },
      { name: 'Pricing', href: '/pricing' },
      { name: 'FAQ', href: '/faq' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { name: 'Documentation', href: '/docs' },
      { name: 'API Reference', href: '/docs/api' },
      { name: 'MQTT Guide', href: '/docs/mqtt' },
      { name: 'WebSocket Guide', href: '/docs/websocket' },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'About', href: '/about' },
      { name: 'Blog', href: '/blog' },
      { name: 'Careers', href: '/careers' },
      { name: 'Contact', href: '/contact' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block">
              <span className="font-bold text-xl inline-block bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                IoT Space
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              A modern IoT platform for monitoring and controlling your devices in real-time
              with powerful dashboards and insights.
            </p>
            <div className="mt-6 flex gap-4">
              <Link 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
              <Link 
                href="mailto:info@iotspace.com" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-5 w-5" />
                <span className="sr-only">Email</span>
              </Link>
              <Link 
                href="https://discord.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="sr-only">Discord</span>
              </Link>
            </div>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-medium">{group.title}</h3>
              <ul className="mt-4 space-y-2">
                {group.links.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="mt-12 border-t pt-6 flex flex-col md:flex-row justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} IoT Space. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
} 