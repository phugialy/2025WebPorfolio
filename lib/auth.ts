/**
 * Auth utilities for client-side use
 * 
 * Re-export NextAuth functions for use in client components
 * This file is separate from the route handler to avoid Next.js 15 build issues
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    // @ts-expect-error - NextAuth.js v5 beta types are incomplete
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          await convex.mutation(api.users.createOrUpdateUser, {
            email: user.email,
            name: user.name || undefined,
            image: user.image || undefined,
          });
        } catch (error) {
          console.error("Failed to create/update user in Convex:", error);
        }
      }
      return true;
    },
    // @ts-expect-error - NextAuth.js v5 beta types are incomplete
    async session({ session }) {
      if (session.user?.email) {
        try {
          const isAdmin = await convex.query(api.users.isAdmin, {
            email: session.user.email,
          });
          if (session.user) {
            session.user.isAdmin = isAdmin || false;
          }
        } catch (error) {
          console.error("Failed to get user admin status:", error);
          if (session.user) {
            session.user.isAdmin = false;
          }
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

// Export auth functions for server-side use
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const { signIn, signOut, auth } = NextAuth(authConfig as any);

