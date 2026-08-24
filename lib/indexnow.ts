const INDEXNOW_KEY = "32d5555d958344bbb6ac5cad77aa3df2";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export async function submitToIndexNow(urls: string[]) {
  if (urls.length === 0) {
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com";
  const host = new URL(baseUrl).host;

  try {
    await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${baseUrl}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
  } catch (error) {
    console.error("IndexNow submission failed", error);
  }
}
