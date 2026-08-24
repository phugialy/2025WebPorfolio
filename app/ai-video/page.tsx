import type { Metadata } from "next";
import { AiVideoWorkspace } from "./workspace";

export const metadata: Metadata = {
  title: "AI Video Workspace",
  description: "Local conversation workspace for OpenRouter video generation.",
};

export default function AiVideoPage() {
  return <AiVideoWorkspace />;
}
