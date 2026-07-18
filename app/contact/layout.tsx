import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Start a conversation with Phu Gia Ly about AI automation, workflow systems, software tooling, or an article from Practical AI & Automation Notes.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
