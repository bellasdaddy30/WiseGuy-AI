import './globals.css';
import Navbar from '../components/Navbar';
import SessionProvider from '../components/SessionProvider';
import PWARegister from '../components/PWARegister';
import { auth } from '../auth';

export const metadata = {
  title: 'SmartAss AI',
  description: 'The AI that doesn\'t pull its punches. 15 personalities, voice built in.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SmartAss AI',
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: '#7c6af7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }) {
  const session = await auth();
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-icon-180.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <PWARegister />
        <SessionProvider session={session}>
          <Navbar />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
