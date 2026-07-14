import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const authConfig = {
  secret: process.env.AUTH_SECRET,
  // Explicitly set the base URL for redirect URIs
  trustHost: true, // Trust the host header (for Vercel/production)
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
          // Create/update user in Convex database
          await convex.mutation(api.users.createOrUpdateUser, {
            email: user.email,
            name: user.name || undefined,
            image: user.image || undefined,
          });
        } catch (error) {
          console.error("Failed to create/update user in Convex:", error);
          // Continue with sign-in even if user creation fails
        }
      }
      return true;
    },
    // @ts-expect-error - NextAuth.js v5 beta types are incomplete
    async session({ session }) {
      if (session?.user?.email) {
        try {
          // Get user admin status from Convex
          const isAdmin = await convex.query(api.users.isAdmin, {
            email: session.user.email,
          });
          if (session.user) {
            session.user.isAdmin = isAdmin || false;
          }
        } catch (error) {
          console.error("Failed to get user admin status:", error);
          if (session?.user) {
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

// NextAuth.js v5 beta has strict type checking - using type assertion
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { handlers } = NextAuth(authConfig as any);

// Export only GET and POST for Next.js route handlers
// Note: Do not export handlers, signIn, signOut, or auth from route files in Next.js 15
// These are exported from lib/auth.ts for server-side use
export const { GET, POST } = handlers;

