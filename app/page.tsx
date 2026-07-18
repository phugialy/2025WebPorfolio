import { Navigation } from "@/components/navigation";
import { LiveHomeDashboard } from "@/components/home/live-home-dashboard";
import { getAllPosts } from "@/lib/articles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const posts = await getAllPosts();

  return (
    <>
      <Navigation />
      <main className="min-h-screen overflow-hidden bg-[#07080b] text-foreground">
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(59,130,246,0.14) 0%, rgba(7,8,11,0) 30%), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "100% 100%, 72px 72px, 72px 72px",
              maskImage: "linear-gradient(180deg, black 0%, black 46%, transparent 100%)",
            }}
          />

          <div className="relative mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
            <div className="rounded-[2rem] bg-white/[0.035] p-3 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-4 lg:p-5">
              <LiveHomeDashboard initialPosts={posts} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
