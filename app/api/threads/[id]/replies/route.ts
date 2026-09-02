import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createReply, getVisibleReplies } from "@/lib/thread-replies";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const replies = await getVisibleReplies(id);
  return NextResponse.json({ replies });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in to reply." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const result = await createReply({
    threadId: id,
    parentReplyId: body.parentReplyId || undefined,
    authorEmail: session.user.email,
    authorName: session.user.name || session.user.email.split("@")[0],
    authorImage: session.user.image,
    body: typeof body.body === "string" ? body.body : "",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ reply: result.reply });
}
