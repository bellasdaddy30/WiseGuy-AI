'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './Navbar.module.css';

const links = [
  { href: '/chat',      label: 'Chat' },
  { href: '/model',     label: 'Model' },
  { href: '/customize', label: 'Customize' },
  { href: '/settings',  label: 'Settings' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

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
      <Link
        href="/account"
        className={`${styles.accountBtn} ${pathname === '/account' ? styles.active : ''}`}
        title={session?.user?.name ?? 'Account'}
      >
        {session?.user?.image ? (
          <img
            src={session.user.image}
            alt={session.user.name ?? 'Account'}
            className={styles.avatar}
          />
        ) : (
          <span className={styles.avatarPlaceholder}>
            {session?.user?.name?.[0]?.toUpperCase() ?? '?'}
          </span>
        )}
      </Link>
    </nav>
  );
}
