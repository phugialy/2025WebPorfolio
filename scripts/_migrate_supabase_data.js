// One-off data + storage migration: old Supabase project -> new Supabase project.
// Reads credentials from env vars only (never hardcode keys here).
// Usage: OLD_SUPABASE_URL=... OLD_SUPABASE_SERVICE_KEY=... NEW_SUPABASE_URL=... NEW_SUPABASE_SERVICE_KEY=... node scripts/_migrate_supabase_data.js

const { createClient } = require("@supabase/supabase-js");

const oldClient = createClient(process.env.OLD_SUPABASE_URL, process.env.OLD_SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const newClient = createClient(process.env.NEW_SUPABASE_URL, process.env.NEW_SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function copyTable(table, orderBy = "created_at") {
  console.log(`\n=== table: ${table} ===`);
  let allRows = [];
  let from = 0;
  const pageSize = 500;
  while (true) {
    const { data, error } = await oldClient
      .from(table)
      .select("*")
      .order(orderBy, { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table} read error: ${error.message}`);
    allRows = allRows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`  read ${allRows.length} rows from old`);
  if (allRows.length === 0) return;

  const chunkSize = 200;
  for (let i = 0; i < allRows.length; i += chunkSize) {
    const chunk = allRows.slice(i, i + chunkSize);
    const { error } = await newClient.from(table).upsert(chunk, { onConflict: "id" });
    if (error) throw new Error(`${table} write error: ${error.message}`);
  }
  console.log(`  wrote ${allRows.length} rows to new`);
}

async function pool(items, limit, fn) {
  let index = 0;
  let active = 0;
  return new Promise((resolve, reject) => {
    let finished = 0;
    if (items.length === 0) return resolve();
    function next() {
      if (finished === items.length) return resolve();
      while (active < limit && index < items.length) {
        const item = items[index++];
        active++;
        fn(item)
          .catch((err) => console.error("  item failed:", err.message))
          .finally(() => {
            active--;
            finished++;
            next();
          });
      }
    }
    next();
  });
}

async function copyFile(bucket, path) {
  const { data, error } = await oldClient.storage.from(bucket).download(path);
  if (error) {
    console.error(`  download failed for ${path}: ${error.message}`);
    return;
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  const { error: uploadError } = await newClient.storage.from(bucket).upload(path, buffer, {
    contentType: data.type,
    upsert: true,
  });
  if (uploadError) {
    console.error(`  upload failed for ${path}: ${uploadError.message}`);
  }
}

async function copyBucket(bucket) {
  console.log(`\n=== bucket: ${bucket} ===`);
  const { data: topLevel, error } = await oldClient.storage.from(bucket).list("", { limit: 1000 });
  if (error) throw new Error(`list ${bucket} error: ${error.message}`);

  const filePaths = [];
  for (const entry of topLevel || []) {
    if (entry.metadata) {
      filePaths.push(entry.name);
    } else {
      const { data: inner, error: innerError } = await oldClient.storage
        .from(bucket)
        .list(entry.name, { limit: 1000 });
      if (innerError) {
        console.error(`  list ${bucket}/${entry.name} failed: ${innerError.message}`);
        continue;
      }
      for (const file of inner || []) {
        if (file.metadata) {
          filePaths.push(`${entry.name}/${file.name}`);
        }
      }
    }
  }

  console.log(`  found ${filePaths.length} files`);
  let done = 0;
  await pool(filePaths, 8, async (path) => {
    await copyFile(bucket, path);
    done++;
    if (done % 25 === 0) console.log(`  ...${done}/${filePaths.length}`);
  });
  console.log(`  copied ${filePaths.length} files`);
}

async function main() {
  await copyTable("article_sources");
  await copyTable("sites");
  await copyTable("articles");
  await copyTable("article_publications");
  await copyTable("article_runs", "started_at");

  await copyBucket("article-images");
  await copyBucket("ai-video-assets");

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("MIGRATION FAILED:", err);
  process.exit(1);
});
