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
    async redirect({ url, baseUrl }) {
      const appUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://www.phugialy.com";
      const appOrigin = new URL(appUrl).origin;

      if (url.startsWith("/")) {
        return `${appOrigin}${url}`;
      }

      const nextUrl = new URL(url);
      if (nextUrl.origin === appOrigin) {
        return url;
      }

      if (nextUrl.origin === new URL(baseUrl).origin) {
        return `${appOrigin}${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      }

      return appOrigin;
    },
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
      // Admin status is a single-owner env comparison, not a Convex lookup --
      // there's exactly one admin (ADMIN_EMAIL), so a query per session read
      // was doing real work to answer a question with one possible answer.
      // Computed server-side here; the client only ever sees the resulting
      // boolean via session.user.isAdmin, never the admin email itself.
      if (session.user?.email) {
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
        session.user.isAdmin = Boolean(adminEmail && session.user.email.toLowerCase() === adminEmail);
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

