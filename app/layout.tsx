import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { SplashScreen } from '@/components/shared/SplashScreen'
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#d6336c",
};

export const metadata: Metadata = {
  title: "Aprdite — Premium Fashion Store",
  description: "Discover curated collections of premium fashion, designed for the modern you.",
  manifest: "/manifest.json",
  icons: {
    icon: "/mylogo.png",
    apple: "/mylogo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aprdite",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-body overflow-x-hidden`}
      >
        <ThemeProvider>
        <SplashScreen />
        {children}
        <Toaster
          position="bottom-center"
          offset={80}
          toastOptions={{
            style: {
              background: 'var(--clay-bg-surface)',
              border: '1px solid var(--clay-border-light)',
              borderRadius: '16px',
              boxShadow: 'var(--clay-shadow-xl)',
              color: 'var(--clay-text)',
              fontSize: '13px',
            },
          }}
        />
        </ThemeProvider>
      </body>
    </html>
  );
}
