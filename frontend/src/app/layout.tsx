import { Inter as FontSans } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { LenisProvider } from '@/lib/smoothScroll';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://iot.spaceautotech.com'),
  title: {
    default: 'SpaceIoT | Industrial IoT Monitoring Platform',
    template: '%s | SpaceIoT',
  },
  description:
    'SpaceIoT is an industrial IoT platform for telemetry, SCADA monitoring, alerts, role-based access control, and operational reporting.',
  applicationName: 'SpaceIoT',
  keywords: [
    'industrial iot',
    'scada monitoring',
    'iot dashboard',
    'mqtt platform',
    'device telemetry',
    'role based access control',
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'SpaceIoT | Industrial IoT Monitoring Platform',
    description:
      'Monitor devices, view telemetry, manage alarms, and operate industrial workflows in one platform.',
    url: '/',
    siteName: 'SpaceIoT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceIoT | Industrial IoT Monitoring Platform',
    description:
      'Industrial IoT monitoring, SCADA workflows, real-time alerts, and reporting.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${fontSans.variable} font-sans antialiased`}>
        <Providers>
          <LenisProvider>
            {children}
          </LenisProvider>
        </Providers>
      </body>
    </html>
  );
}
