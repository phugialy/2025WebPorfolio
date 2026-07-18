import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Practical AI and automation notes from Phu Gia Ly: field-tested views on agents, workflow systems, software decisions, and human review.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog | Phu Gia Ly",
    description:
      "Field notes on AI tools, automation systems, agentic workflows, and software decisions from a builder's point of view.",
    url: "/blog",
    images: [
      {
        url: "/brand/phugialy-social-card.png",
        width: 1200,
        height: 630,
        alt: "Phu Gia Ly Practical AI Automation Systems",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | Phu Gia Ly",
    description:
      "Practical AI and automation notes from Phu Gia Ly.",
    images: ["/brand/phugialy-social-card.png"],
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

