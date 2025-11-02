import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Thoughts on web development, software engineering, and technology.",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

