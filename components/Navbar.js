'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

const links = [
  { href: '/chat',      label: 'Chat' },
  { href: '/model',     label: 'Model' },
  { href: '/customize', label: 'Personas' },
  { href: '/paid',      label: 'Pro' },
  { href: '/settings',  label: 'Settings' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} suppressHydrationWarning>
      <Link href="/" className={styles.brand}>
        <span className={styles.brandWise}>Wise</span><span className={styles.brandGuy}>Guy</span><span className={styles.brandAI}> AI</span>
      </Link>
      <ul className={styles.links} suppressHydrationWarning>
        {links.map(({ href, label }) => (
          <li key={href} suppressHydrationWarning>
            <Link
              href={href}
              className={`${styles.link} ${pathname === href ? styles.active : ''}`}
              suppressHydrationWarning
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
