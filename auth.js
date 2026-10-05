import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { recordSignIn } from './lib/users';

// Sign-in is Google's job: the app never sees or stores a password. What the
// app keeps is a signed, encrypted cookie (the "token" below) saying who you
// are, and a row in the users table so the server remembers you between
// devices (lib/users.js).
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  pages: {
    signIn: '/account',
  },
  callbacks: {
    // Runs whenever the cookie is created or read. `account` is only present at
    // the moment of signing in, so the database is written once per sign-in and
    // not on every page load.
    async jwt({ token, account, user }) {
      if (account) {
        try {
          const saved = await recordSignIn({
            provider:   account.provider,            // 'google'
            providerId: account.providerAccountId,   // Google's permanent ID for this person
            email:      user?.email ?? token.email,
            name:       user?.name ?? token.name,
            image:      user?.image ?? token.picture,
          });
          // Our own ID for this user. Everything stored per user hangs off it.
          if (saved) token.uid = saved.id;
        } catch (err) {
          // A database problem must not lock anyone out. They are signed in
          // without an account row and the Account page says so.
          console.error('[auth] could not save the user:', err.code || err.message);
        }
      }
      return token;
    },
    // Decides what the rest of the app can see about the signed-in user
    session({ session, token }) {
      if (session.user && token?.uid) session.user.id = token.uid;
      return session;
    },
  },
});
