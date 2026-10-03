import './globals.css';
import Navbar from '../components/Navbar';
import SessionProvider from '../components/SessionProvider';
import { auth } from '../auth';

export const metadata = {
  title: 'SmartAss AI',
  description: 'An AI assistant with actual personality.',
};

export default async function RootLayout({ children }) {
  const session = await auth();
  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>
          <Navbar />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
