import { auth, signIn, signOut } from '../../auth';
import { dbConfigured } from '../../lib/db';
import { getUser } from '../../lib/users';
import { PLANS } from '../../lib/premium';
import styles from './account.module.css';

// Reads the signed-in user's row from the database. Returns
//   { account }   the row, when everything is in place
//   { note }      a plain explanation when it is not
async function loadAccount(session) {
  if (!dbConfigured()) {
    return { note: 'Account storage is not set up on this copy of the app, so nothing about you is saved on the server.' };
  }
  if (!session.user.id) {
    // Signed in before accounts were saved, or the save failed at sign-in
    return { note: 'Your account has not been saved yet. Sign out and back in once to finish setting it up.' };
  }
  try {
    const account = await getUser(session.user.id);
    if (account) return { account };
    return { note: 'Your account could not be found. Sign out and back in to set it up again.' };
  } catch (err) {
    console.error('[account] could not load the user:', err.code || err.message);
    return { note: 'Your account details could not be loaded right now. Try again in a moment.' };
  }
}

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Sign In</h1>
          <p className={styles.subtitle}>
            Sign in with Google. Your settings and chat history are saved on this device; syncing them across devices is coming soon.
          </p>
          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/chat' });
            }}
          >
            <button type="submit" className={styles.googleBtn}>
              <GoogleIcon />
              Continue with Google
            </button>
          </form>
        </div>
      </main>
    );
  }

  const { name, email, image } = session.user;
  const { account, note } = await loadAccount(session);
  const plan = account ? (PLANS[account.plan]?.label ?? account.plan) : null;
  const since = account
    ? new Date(account.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
    : null;

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.profile}>
          {image ? (
            <img src={image} alt={name} className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div>
            <div className={styles.name}>{name}</div>
            <div className={styles.email}>{email}</div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Account</h2>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Signed in via</span>
            <span className={styles.rowValue}>Google</span>
          </div>
          {account && (
            <>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Plan</span>
                <span className={styles.rowValue}>{plan}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Member since</span>
                <span className={styles.rowValue}>{since}</span>
              </div>
            </>
          )}
          {note && <p className={styles.note}>{note}</p>}
        </div>

        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/' });
          }}
        >
          <button type="submit" className={styles.signOutBtn}>
            Sign Out
          </button>
        </form>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
