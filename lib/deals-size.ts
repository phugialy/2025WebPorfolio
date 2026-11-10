// "Size of purchase" labels for the Deals pages. Pure logic, no imports, so it
// runs under Vitest with no setup.
//
// Why not prices: Amazon allows a price on the page only when it comes from its
// own API with a timestamp, and this site has no such feed, so no dollar
// amount and no "$ / $$ / $$$" appears anywhere. A reader who wonders "is this
// in my budget?" still gets a coarse answer: is this the kind of thing that is a
// small add-on, a mid-size buy, or a big purchase? The label describes the
// product, not today's price, and the card says the price is on Amazon.
//
// The sizes are hand-assigned per product (a webcam can be $40 or $200, so a
// category-wide label would mislead) from general product knowledge, not from
// live prices. Bands are fuzzy on purpose:
//   small - the kind of thing you add to an order without thinking much
//   mid   - a considered purchase you compare a few options for
//   big   - a major purchase: computers, graphics cards, large monitors,
//           premium headphones, electric desks
// A product with no entry and no reliable category default shows no label.
// Review these in /deals when a product's typical size changes.

export type PurchaseSize = "small" | "mid" | "big";

export const PURCHASE_SIZES: readonly PurchaseSize[] = ["small", "mid", "big"];

export const PURCHASE_SIZE_LABEL: Record<PurchaseSize, { text: string; plural: string; dots: 1 | 2 | 3 }> = {
  small: { text: "Small add-on", plural: "Small add-ons", dots: 1 },
  mid: { text: "Mid-size buy", plural: "Mid-size buys", dots: 2 },
  big: { text: "Big purchase", plural: "Big purchases", dots: 3 },
};

export const PURCHASE_SIZE_LEGEND =
  "Size labels describe the kind of product, not today's price. Prices change daily, so check the current price on Amazon.";

// Hand controls. Keys are affiliate_products.id values. Review the list when a
// product is added; the name after each entry is only a reminder.
export const PURCHASE_SIZE_BY_PRODUCT: Record<string, PurchaseSize> = {
  "aede1291-e3e7-427b-9b7e-6e7b484d224b": "big", // GMKtec K15 AI Mini PC
  "04a33bdf-68a6-4b1d-9dfb-abea3f01a14b": "big", // GMKtec EVO-X1 AI Mini PC
  "e2aba879-8d20-41d1-9cd9-ab953804d39d": "big", // 2024 Mac mini M4
  "7dac86b1-5a2f-4c93-a759-fc493af751d7": "big", // ASUS TUF GeForce RTX 5070
  "f2fe368a-80d6-4abb-850d-c31430febfd8": "big", // GMKtec M5 Ultra Gaming Mini PC
  "cb6ac688-69ab-41d8-84dd-70f1c9e65be2": "big", // GMKtec K13 AI Mini PC
  "7b264c53-3b8e-46e7-b35b-2e5f6e23bb34": "big", // GMKtec EVO-T2S Mini PC
  "76cc0782-ef9d-4705-8c2b-269020a583d3": "big", // NVIDIA DGX Spark
  "ed7978b8-236d-4a16-9f3f-e945204b9a83": "big", // GEEKOM IT15 AI Mini PC
  "dd6d1602-b10f-4c8f-bcee-9e52426d9295": "big", // Alienware 34 AW3425DWM
  "f8cf0178-d060-4e37-9ff7-155b7ee794e8": "big", // LG 38WN75C-B
  "18fc06a5-8c0e-43c4-bcfd-3b8d720e6217": "big", // LG 34WN80C-B
  "fb4bc5b8-caa7-4960-b77c-e53b3bf5ca18": "big", // Sony WH-1000XM5
  "77b1e579-66a4-40fd-bc07-82468db8afaf": "big", // Bose QuietComfort Headphones
  "1fe0b293-0f11-4e64-bcdd-bed27937f683": "big", // Vari VariDesk Pro Plus 36
  "066d7468-3b39-4cde-a7ce-881fb7d15a1e": "big", // VERSADESK PowerPro 36
  "02020d97-3811-4f2b-bc1a-427f4c1d8e5a": "mid", // LG 34WR55QK-B
  "53d33449-8877-47cd-ac70-39de26615e5d": "mid", // NVIDIA Jetson Xavier NX
  "08a87eec-d169-4a2e-a40d-b7514f76d58e": "mid", // waveshare Hailo-8 M.2
  "f96b9132-1fbe-440f-860f-6761077f669d": "mid", // Soundcore Q20i
  "823ae34b-3c96-4d4b-bddf-fbc78f0b4d9e": "mid", // JLab JBuds Lux ANC
  "c042baf6-f894-4c8a-b1ea-02fe03868e75": "mid", // JBL Tune 770NC
  "6c305b2e-3ba7-4e7a-9c98-a89bcadbbfe4": "mid", // Insta360 Link 2
  "291a6660-6a75-4280-befc-a31c06f2b7a4": "mid", // EMEET NOVA 4K
  "6b8eb8e4-0f02-4bdf-9ab9-ae5e2be72098": "mid", // Logitech Brio 4K
  "a758efad-4536-4e95-9c82-567191f3acbf": "mid", // Logitech C920x
  "bb6cbf3d-c6eb-4b80-ba8c-3153448a0d3d": "mid", // Wacom Intuos Small
  "797c558d-fd73-44d6-861a-11a12ea386dd": "mid", // HUION Inspiroy 2 Large
  "587dd75b-26f2-4bf8-bf04-4642301e958e": "mid", // VIVO 26 in standing desk converter
  "3bcb4e07-249a-4c15-899e-2a74481b5a4d": "mid", // Samsung T7 Shield 2TB
  "ac5e5c10-f739-4ec6-ac19-661ce9a38786": "mid", // SanDisk Extreme Portable 2TB
  "d5173a4e-7e9e-4509-bf6d-e05d9c985511": "mid", // Dell WD25 dock
  "35888e48-3c38-4da6-90f3-b5ba1d894fbb": "mid", // Anker dual-monitor dock
  "0b39cf4a-67f0-4362-8fb1-efe8a76f04d9": "mid", // AULA F99
  "4db74ea5-0597-4520-91a5-57d8f4aa86b0": "mid", // RK ROYAL KLUDGE R98 Pro
  "b9ac8da7-f19c-41b5-a2d7-46d09352a8d6": "mid", // Logitech Wave Keys
  "ad71b315-1fd0-4a09-97b7-1806a3c1a3ae": "mid", // Logitech Ergo K860
  "4e672c09-d800-4a92-a234-0fc48a56ee6a": "mid", // Logitech MX Vertical
  "0b7fe34e-d9d4-4539-8747-28245f059073": "mid", // AOC Portable Monitor
  "476c602c-4a61-44c6-b90d-70794f547362": "mid", // cocopar Portable Monitor
  "6f7aaeef-e6b7-4288-a932-f141a8775b50": "mid", // KYY Portable Monitor
  "0408f074-638b-403b-aa92-dc8a30acc3a0": "small", // Anker USB-C Hub 7-in-1
  "a2b39ea9-6429-4836-9f90-9b522f15fb8d": "small", // Anker USB-C Hub 5-in-1
  "ceb960fe-3b42-4a79-9351-e0ee644047ad": "small", // Logitech G413 SE
  "497b0d23-3f6d-4173-bd5d-dff4a7ee6f8d": "small", // Perixx PERIBOARD-512B
  "7d98ab51-4a15-440d-9cc3-d00d30e8f1a8": "small", // Logitech Brio 101
  "00ddcb77-9be4-4f07-9112-94d1db814d30": "small", // NexiGo N60
  "66afc5ca-7dec-4fd1-bbf5-a336fa12d707": "small", // AOC Ergonomic Mouse
  "b9762229-ff42-43a8-b4d3-44157ba1007c": "small", // TECKNET Wireless Mouse
  "4b2ee344-8406-471e-ad7c-950a711b340d": "small", // VSD M18 Macro Pad
  "966ea5c7-d42c-474e-980b-2fbb58841b62": "small", // OMOTON C2 phone stand
  "bb6f6d20-a4e5-4145-95ce-78b41a3eb0e7": "small", // Anker USB-C cable 2-pack
  "8dd58ad5-b9ba-4ef5-b751-e7aa6525682f": "small", // INIU power bank
  "aff5374d-8f63-4754-8de9-8c31ef45184e": "small", // Screen Mom cleaner
  "1d23dc83-b49a-4e10-bc90-4cca8e6c83d4": "small", // Stanley Quencher
  "2f87ebbd-4a19-491d-87d7-230e2ac667df": "small", // livho blue-light glasses
};

// Categories whose products are all about the same size, so a product with no
// entry above can still be labeled. Anything else (including every category
// that mixes cheap and expensive items) shows no label until it is added above.
const SIZE_BY_CATEGORY: Record<string, PurchaseSize> = {
  laptops: "big",
  phones: "big",
  smartphones: "big",
  smartwatches: "mid",
  "cables & chargers": "small",
  "cleaning & care": "small",
};

export function purchaseSize(product: { id?: string | null; category?: string | null }): PurchaseSize | null {
  if (product.id && PURCHASE_SIZE_BY_PRODUCT[product.id]) return PURCHASE_SIZE_BY_PRODUCT[product.id];
  const category = (product.category ?? "").trim().toLowerCase();
  return SIZE_BY_CATEGORY[category] ?? null;
}

export function isPurchaseSize(value: unknown): value is PurchaseSize {
  return value === "small" || value === "mid" || value === "big";
}
