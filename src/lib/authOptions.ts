import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const providers: NextAuthOptions['providers'] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }));
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async session({ session }) {
      if (session.user) {
        session.user.name = session.user.name ?? (null as any);
        session.user.email = session.user.email ?? (null as any);
      }
      return session;
    },
  },
};