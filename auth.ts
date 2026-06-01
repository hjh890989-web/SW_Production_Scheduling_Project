import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(_credentials) {
        return null;
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  trustHost: true,
});

export const ROLES = ['Admin', 'Manager', 'Sales', 'Material', 'ExtrusionForeman', 'MoldingForeman'] as const;
export type Role = (typeof ROLES)[number];
