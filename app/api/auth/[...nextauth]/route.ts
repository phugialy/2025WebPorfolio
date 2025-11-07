import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const { handlers, signIn, signOut, auth } = NextAuth({
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
    async signIn({ user, account, profile }) {
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
    async session({ session, token }) {
      if (session.user?.email) {
        try {
          // Get user admin status from Convex
          const isAdmin = await convex.query(api.users.isAdmin, {
            email: session.user.email,
          });
          session.user.isAdmin = isAdmin || false;
        } catch (error) {
          console.error("Failed to get user admin status:", error);
          session.user.isAdmin = false;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});

export const { GET, POST } = handlers;

