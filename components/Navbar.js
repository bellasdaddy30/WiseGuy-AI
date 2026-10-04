'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

const links = [
  { href: '/chat',      label: 'Chat' },
  { href: '/model',     label: 'Model' },
  { href: '/customize', label: 'Customize' },
  { href: '/audiobook', label: 'Audiobook' },
  { href: '/music',     label: 'Music' },
  { href: '/account',   label: 'Account' },
  { href: '/settings',  label: 'Settings' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.brand}>SmartAss AI</Link>
      <ul className={styles.links}>
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className={`${styles.link} ${pathname === href ? styles.active : ''}`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
