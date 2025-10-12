/**
 * RSS Harvest Script
 * Fetches RSS feeds and creates MDX files for new blog posts
 * Run via: pnpm rss:harvest
 */

import fs from "fs";
import path from "path";
import { createHash } from "crypto";

interface RSSConfig {
  feeds: string[];
  maxItemsPerRun: number;
  skipDomains: string[];
}

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  creator?: string;
}

const CONTENT_DIR = path.join(process.cwd(), "content");
const INBOX_DIR = path.join(CONTENT_DIR, "inbox");
const RSS_CONFIG_PATH = path.join(process.cwd(), "rss.json");
const SEEN_ITEMS_PATH = path.join(CONTENT_DIR, ".seen_items.json");

/**
 * Load seen items cache
 */
function loadSeenItems(): Set<string> {
  try {
    if (fs.existsSync(SEEN_ITEMS_PATH)) {
      const data = JSON.parse(fs.readFileSync(SEEN_ITEMS_PATH, "utf8"));
      return new Set(data);
    }
  } catch (error) {
    console.error("Error loading seen items:", error);
  }
  return new Set();
}

/**
 * Save seen items cache
 */
function saveSeenItems(items: Set<string>) {
  try {
    fs.writeFileSync(SEEN_ITEMS_PATH, JSON.stringify([...items], null, 2));
  } catch (error) {
    console.error("Error saving seen items:", error);
  }
}

/**
 * Generate unique hash for an item
 */
function getItemHash(link: string, title: string): string {
  return createHash("md5").update(`${link}${title}`).digest("hex");
}

/**
 * Parse simple RSS/Atom feed (basic implementation)
 */
function parseFeed(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  
  // Match item or entry tags
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
  const matches = xml.matchAll(itemRegex);

  for (const match of matches) {
    const itemXml = match[1];
    
    // Extract title
    const titleMatch = itemXml.match(/<title(?:[^>]*)>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim() : "";
    
    // Extract link
    const linkMatch = itemXml.match(/<link(?:[^>]*)>([\s\S]*?)<\/link>/i) || itemXml.match(/<link[^>]*href="([^"]+)"/i);
    const link = linkMatch ? linkMatch[1].trim() : "";
    
    // Extract description
    const descMatch = itemXml.match(/<(?:description|summary)(?:[^>]*)>([\s\S]*?)<\/(?:description|summary)>/i);
    const description = descMatch ? descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").trim() : "";
    
    // Extract pubDate
    const dateMatch = itemXml.match(/<(?:pubDate|published|updated)(?:[^>]*)>([\s\S]*?)<\/(?:pubDate|published|updated)>/i);
    const pubDate = dateMatch ? dateMatch[1].trim() : "";
    
    // Extract creator
    const creatorMatch = itemXml.match(/<(?:creator|author)(?:[^>]*)>([\s\S]*?)<\/(?:creator|author)>/i);
    const creator = creatorMatch ? creatorMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").replace(/<name>(.*?)<\/name>/i, "$1").trim() : "";
    
    if (title && link) {
      items.push({ title, link, description, pubDate, creator });
    }
  }
  
  return items;
}

/**
 * Create MDX file for an item
 */
function createMDXFile(item: RSSItem): string {
  const slug = item.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  
  const date = item.pubDate ? new Date(item.pubDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
  const fileName = `${date}-${slug}.mdx`;
  const filePath = path.join(INBOX_DIR, fileName);
  
  // Ensure inbox directory exists
  if (!fs.existsSync(INBOX_DIR)) {
    fs.mkdirSync(INBOX_DIR, { recursive: true });
  }
  
  const summary = item.description ? item.description.slice(0, 200) + (item.description.length > 200 ? "..." : "") : "";
  
  const frontmatter = `---
title: "${item.title.replace(/"/g, '\\"')}"
date: "${date}"
canonical_link: "${item.link}"
author: "${item.creator || "External Author"}"
tags: ["curated"]
summary: "${summary.replace(/"/g, '\\"')}"
featured: false
---

# ${item.title}

${summary}

[Read the full article →](${item.link})

---

*This post was automatically curated from an external RSS feed.*
`;
  
  fs.writeFileSync(filePath, frontmatter);
  return fileName;
}

/**
 * Main harvest function
 */
async function harvest() {
  console.log("🌾 Starting RSS harvest...\n");
  
  // Load configuration
  let config: RSSConfig;
  try {
    config = JSON.parse(fs.readFileSync(RSS_CONFIG_PATH, "utf8"));
  } catch (error) {
    console.error("❌ Error loading rss.json:", error);
    process.exit(1);
  }
  
  const seenItems = loadSeenItems();
  const newFiles: string[] = [];
  let itemsProcessed = 0;
  
  // Process each feed
  for (const feedUrl of config.feeds) {
    if (itemsProcessed >= config.maxItemsPerRun) {
      console.log(`✓ Reached max items limit (${config.maxItemsPerRun})`);
      break;
    }
    
    try {
      console.log(`📡 Fetching: ${feedUrl}`);
      const response = await fetch(feedUrl);
      
      if (!response.ok) {
        console.error(`❌ Failed to fetch ${feedUrl}: ${response.statusText}`);
        continue;
      }
      
      const xml = await response.text();
      const items = parseFeed(xml);
      console.log(`   Found ${items.length} items`);
      
      // Process items
      for (const item of items) {
        if (itemsProcessed >= config.maxItemsPerRun) break;
        
        // Skip if domain is in skipDomains
        const domain = new URL(item.link).hostname;
        if (config.skipDomains.includes(domain)) {
          console.log(`   ⏭️  Skipping ${domain} (in skipDomains)`);
          continue;
        }
        
        // Check if already seen
        const hash = getItemHash(item.link, item.title);
        if (seenItems.has(hash)) {
          continue;
        }
        
        // Create MDX file
        try {
          const fileName = createMDXFile(item);
          newFiles.push(fileName);
          seenItems.add(hash);
          itemsProcessed++;
          console.log(`   ✓ Created: ${fileName}`);
        } catch (error) {
          console.error(`   ❌ Error creating file for "${item.title}":`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${feedUrl}:`, error);
    }
  }
  
  // Save seen items
  saveSeenItems(seenItems);
  
  // Summary
  console.log(`\n✨ Harvest complete!`);
  console.log(`   New files: ${newFiles.length}`);
  console.log(`   Total seen: ${seenItems.size}`);
  
  if (newFiles.length > 0) {
    console.log(`\n📝 New files created:`);
    newFiles.forEach((file) => console.log(`   - ${file}`));
  }
  
  process.exit(0);
}

// Run harvest
harvest().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

