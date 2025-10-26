import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { supabaseServer } from '@/lib/supabaseClient';

const providers: NextAuthOptions['providers'] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authorization: {
      params: {
        prompt: 'consent',
        access_type: 'offline',
        response_type: 'code'
      }
    }
  }));
}

// Override NEXTAUTH_URL in development to use port 3000
if (process.env.NODE_ENV === 'development') {
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
}

export const authOptions: NextAuthOptions = {
  providers,
  // Use JWT sessions (no database required)
  session: {
    strategy: 'jwt',
  },
  // Enable verbose logging in development or when NEXTAUTH_DEBUG=true
  debug: process.env.NODE_ENV === 'development' || process.env.NEXTAUTH_DEBUG === 'true',
  // Prevent OAuthAccountNotLinked by allowing linking accounts with same email
  allowDangerousEmailAccountLinking: true,
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('[NextAuth] signIn callback triggered');
      console.log('[NextAuth] User:', user.email);
      console.log('[NextAuth] Provider:', account?.provider);

      // Ensure user exists in our database
      if (user.email) {
        const supabase = supabaseServer();
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (!existingUser) {
          console.log('[NextAuth] Creating new user in database:', user.email);
          await supabase.from('users').insert({
            email: user.email,
            name: user.name || null,
          });
        } else {
          console.log('[NextAuth] User already exists in database');
        }
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      console.log('[NextAuth] Redirect callback');
      console.log('[NextAuth] URL:', url);
      console.log('[NextAuth] Base URL:', baseUrl);

      // Ensure we stay on localhost:3000 in development
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async session({ session, token }) {
      console.log('[NextAuth] Session callback');
      if (session.user) {
        session.user.name = session.user.name ?? (null as any);
        session.user.email = session.user.email ?? (null as any);
        console.log('[NextAuth] Session user:', session.user.email);
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        console.log('[NextAuth] JWT callback - new user sign in');
        console.log('[NextAuth] User email:', user.email);
      }
      return token;
    },
  },
  events: {
    async signIn({ user }) {
      console.log('[NextAuth] Sign in event - User:', user.email);
    },
    async signOut() {
      console.log('[NextAuth] Sign out event');
    },
    async createUser({ user }) {
      console.log('[NextAuth] Create user event - User:', user.email);
    },
    async session({ session }) {
      console.log('[NextAuth] Session event active');
    },
  },
};