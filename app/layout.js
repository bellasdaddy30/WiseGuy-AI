import './globals.css';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'SmartAss AI',
  description: 'An AI assistant with actual personality.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
