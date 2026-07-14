import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { articleSystemPrompt } from "@/lib/article-style";
import { generateOpenRouterText } from "@/lib/openrouter";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractJson(value: string) {
  const fenced = value.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced || value.match(/\{[\s\S]*\}/)?.[0] || value;
  return JSON.parse(raw) as {
    assistantMessage?: string;
    idea?: string;
    notes?: string;
    urls?: string[];
    imageDirection?: string;
    sourcePlanMarkdown?: string;
  };
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = await request.json();
  const prompt = cleanText(body.prompt);
  const messages: ChatMessage[] = Array.isArray(body.messages)
    ? body.messages
        .filter(
          (message: ChatMessage) =>
            ["user", "assistant"].includes(message.role) && cleanText(message.content)
        )
        .slice(-8)
    : [];
  const current = {
    idea: cleanText(body.current?.idea),
    notes: cleanText(body.current?.notes),
    urls: Array.isArray(body.current?.urls)
      ? (body.current.urls as unknown[]).map(cleanText).filter(Boolean).slice(0, 5)
      : [],
    imageDirection: cleanText(body.current?.imageDirection),
  };

  if (!prompt) {
    return NextResponse.json({ error: "Tell the strategist what idea to shape." }, { status: 400 });
  }

  const result = await generateOpenRouterText([
    {
      role: "system",
      content: `${articleSystemPrompt}

You are the AI Strategist for Phu's admin article intake.
Your job is not to write the article. Your job is to fill the blanks for the downstream research, writer, and image agents.

Return only JSON with this shape:
{
  "assistantMessage": "short conversational response to the user",
  "idea": "polished article idea in plain English",
  "notes": "Markdown direction for the writer agent, including angle, audience, structure, practical example, risks, and what to avoid",
  "urls": ["https://credible-source.example/path"],
  "imageDirection": "Markdown image direction for the image agent, including visual metaphor, thumbnail needs, inside-paper visual ideas, and what to avoid",
  "sourcePlanMarkdown": "Markdown list of source types or search targets if exact URLs are not confidently known"
}

Rules:
- Prefer credible official docs, engineering blogs, release notes, vendor docs, and practical case-study sources.
- Only include exact URLs when you are confident they are real and relevant.
- If exact URLs are uncertain, leave urls empty and put source/search guidance in notes and sourcePlanMarkdown.
- Keep the output concise enough to fit an intake form.
- The filled fields should help another AI produce the article later.`,
    },
    {
      role: "user",
      content: `Conversation so far:
${messages.map((message) => `${message.role}: ${message.content}`).join("\n")}

Current form values:
Idea: ${current.idea || "empty"}
Notes: ${current.notes || "empty"}
URLs: ${current.urls.join(", ") || "empty"}
Image direction: ${current.imageDirection || "empty"}

New user message:
${prompt}`,
    },
  ]);

  const shaped = extractJson(result.content);

  return NextResponse.json({
    assistantMessage:
      cleanText(shaped.assistantMessage) ||
      "I shaped the idea into a draft-ready intake brief.",
    fields: {
      idea: cleanText(shaped.idea),
      notes: cleanText(shaped.notes),
      urls: Array.isArray(shaped.urls)
        ? shaped.urls.map(cleanText).filter((url) => /^https?:\/\//i.test(url)).slice(0, 5)
        : [],
      imageDirection: cleanText(shaped.imageDirection),
      sourcePlanMarkdown: cleanText(shaped.sourcePlanMarkdown),
    },
    model: result.model,
    usage: result.usage,
  });
}
