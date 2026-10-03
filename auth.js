import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  pages: {
    signIn: '/account',
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
});
