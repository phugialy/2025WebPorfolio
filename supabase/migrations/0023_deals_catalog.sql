-- Dedicated product catalog for the Deals pages (/deals and /deals/<holiday>).
-- Run in the Supabase SQL Editor. Safe to run more than once.
--
-- The Deals pages read the same affiliate_products rows as the rest of the
-- site, but ONLY the products that have a row here, and they take their tags
-- from this row. A product with no row here is not shown on the Deals pages.
-- Until this table exists (or while it is empty) the pages fall back to every
-- eligible product with tags worked out from its category.
--
-- Row level security is ON with NO policies, so the public anon key can neither
-- read nor write it. The site reads it server-side with the service-role key.

create table if not exists deals_catalog (
  product_id uuid primary key references affiliate_products(id) on delete cascade,
  -- Tags the Deals pages understand:
  --   technology, ai, books, desk
  --   thanksgiving-week, black-friday, cyber-monday, christmas-gifts, new-year-setup
  -- A holiday tag puts the product on that holiday's Top 10 and its catalog tab.
  tags text[] not null default '{}',
  pinned_rank integer check (pinned_rank is null or pinned_rank > 0), -- 1 = first; null = not pinned
  hidden boolean not null default false,                               -- true = keep the row but do not show it
  note text,                                                           -- free text for you (not shown on the site)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deals_catalog_tags_idx on deals_catalog using gin (tags);

alter table deals_catalog enable row level security;

-- Starting set: 81 products, tagged from their category by the same rules the site uses.
-- Products the research pass held back (Jetson kit, Claude Code Mastery, Agentic AI Bible,
-- EVO-T2S, Hands-On ML, the duplicate 2084 book) are deliberately NOT included.
insert into deals_catalog (product_id, tags, note) values
  ('014407cf-079f-4870-bf89-36256b046e48', '{ai,books,christmas-gifts,new-year-setup}', 'AI (Books) | Co-Intelligence: Living and Working with AI'),
  ('1f6b075f-22a7-4646-b30a-5f9b33b2e4a1', '{ai,books,christmas-gifts,new-year-setup}', 'AI (Books) | The Claude AI Bible: The Complete and Easy-to-Follow Guide to Mastering Claude – Build Practical Workflows,'),
  ('905eba39-f4bb-41b2-910c-2b142a10e728', '{ai,books,christmas-gifts,new-year-setup}', 'AI Engineering | 2084 and the AI Revolution, Updated and Expanded Edition: How Artificial Intelligence Informs Our Futur'),
  ('5819ce4b-bee1-4c1b-8e74-5827844dfa1c', '{ai,books,christmas-gifts,new-year-setup}', 'AI Engineering | AI Engineering: Building Applications with Foundation Models'),
  ('30388f7a-7028-4582-a212-eb01726e95cd', '{ai,books,christmas-gifts,new-year-setup}', 'AI Engineering | Claude Visual Bible: A step-by-step, screenshot-by-screenshot guide to writing, researching, analyzing,'),
  ('f0453c72-8958-4f5b-a365-765e17e91765', '{ai,books,christmas-gifts,new-year-setup}', 'AI Engineering | The AI Engineering Systems: Build, Deploy, and Scale Production AI Systems—Step-by-Step Walkthroughs Pl'),
  ('62367e7c-fe68-4f6e-a645-af0282e789b0', '{ai,books,christmas-gifts,new-year-setup}', 'AI Engineering (Books) | The AI Engineering Bible: The Complete and Up-to-Date Guide to Build, Deploy and Scale Producti'),
  ('e2aba879-8d20-41d1-9cd9-ab953804d39d', '{technology,ai,thanksgiving-week,black-friday,cyber-monday,christmas-gifts}', 'AI Hardware | 2024 Mac mini Desktop Computer with M4 chip, 10-core CPU and 10-core GPU'),
  ('7dac86b1-5a2f-4c93-a759-fc493af751d7', '{technology,ai,thanksgiving-week,black-friday,cyber-monday,christmas-gifts}', 'AI Hardware | ASUS TUF Gaming GeForce RTX 5070 12GB GDDR7 OC Edition Graphics Card'),
  ('ed7978b8-236d-4a16-9f3f-e945204b9a83', '{technology,ai,thanksgiving-week,black-friday,cyber-monday,christmas-gifts}', 'AI Hardware | GEEKOM IT15 AI Mini PC, Intel Ultra 9 285H(99 Tops), 32GB DDR5, 1TB SSD | The Most Powerful Workstation,Ar'),
  ('04a33bdf-68a6-4b1d-9dfb-abea3f01a14b', '{technology,ai,thanksgiving-week,black-friday,cyber-monday,christmas-gifts}', 'AI Hardware | GMKtec EVO-X1 AI Mini PC AMD Ryzen AI 9 HX-370 Series 5.1GHz, 80 Tops'),
  ('cb6ac688-69ab-41d8-84dd-70f1c9e65be2', '{technology,ai,thanksgiving-week,black-friday,cyber-monday,christmas-gifts}', 'AI Hardware | GMKtec K13 AI Mini PC Intel Core Ultra 7 256V 16GB LPDDR5X 1TB SSD'),
  ('aede1291-e3e7-427b-9b7e-6e7b484d224b', '{technology,ai,thanksgiving-week,black-friday,cyber-monday,christmas-gifts}', 'AI Hardware | GMKtec K15 AI Mini PC Oculink Intel Ultra 5 125U 32GB DDR5 512GB SSD | Desktop Computer AI Boost, 3X M.2 2'),
  ('f2fe368a-80d6-4abb-850d-c31430febfd8', '{technology,ai,thanksgiving-week,black-friday,cyber-monday,christmas-gifts}', 'AI Hardware | GMKtec M5 Ultra Gaming Mini PC Ryzen 7 7730U 32GB RAM 512GB SSD'),
  ('76cc0782-ef9d-4705-8c2b-269020a583d3', '{technology,ai,thanksgiving-week,black-friday,cyber-monday,christmas-gifts}', 'AI Hardware | NVIDIA DGX Spark™ - Personal AI Desktop Supercomputer – Desktop GB10 Grace Blackwell Chip'),
  ('08a87eec-d169-4a2e-a40d-b7514f76d58e', '{technology,ai,thanksgiving-week,black-friday,cyber-monday,christmas-gifts}', 'AI Hardware | waveshare Hailo-8 M.2 AI Accelerator Module, Compatible with Raspberry Pi 5, Supports Linux/Windows System'),
  ('b1ba74d4-a37d-4ad4-a7c8-76713e2bad42', '{ai,books,christmas-gifts,new-year-setup}', 'AI Research (Books) | Best AI Prompts for Genealogy Research (2026 Edition)'),
  ('9415f2d7-a7f7-460f-83d9-df44e1a6a712', '{ai,books,christmas-gifts,new-year-setup}', 'AI Safety (Books) | FAIK: A Practical Guide to Living in a World of Deepfakes, Disinformation, and AI-Generated Deceptio'),
  ('b29c81ca-26f2-443d-b708-d44e43722541', '{ai,books,christmas-gifts,new-year-setup}', 'AI Safety (Books) | If Anyone Builds It, Everyone Dies: Why Superhuman AI Would Kill Us All'),
  ('62328633-6e68-4d67-9ae2-a5bfc1d261bc', '{ai,books,christmas-gifts,new-year-setup}', 'AI Security (Books) | Data Security in the Age of AI: A Guide to Protecting Data and Reducing Risk in an AI-Driven World'),
  ('77b1e579-66a4-40fd-bc07-82468db8afaf', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Audio | Bose QuietComfort Headphones - Wireless Bluetooth Headphones, Active Over Ear Noise Cancelling and Mic, USB-C Ch'),
  ('c042baf6-f894-4c8a-b1ea-02fe03868e75', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Audio | JBL Tune 770NC - Wireless Over-Ear Headphones - Black | Adaptive Noise Cancelling with Smart Ambient, Bluetooth '),
  ('823ae34b-3c96-4d4b-bddf-fbc78f0b4d9e', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Audio | JLab, JBuds Lux ANC, Over Ear Headphones, Active Noise Cancelling, Bluetooth, Spatial Audio, Sage'),
  ('fb4bc5b8-caa7-4960-b77c-e53b3bf5ca18', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Audio | Sony WH-1000XM5 Premium Noise Cancelling Wireless Headphones'),
  ('f96b9132-1fbe-440f-860f-6761077f669d', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Audio | Soundcore by Anker Q20i Hybrid Active Noise Cancelling Headphones, White | Over-Ear, Bluetooth, 40H ANC Playtime'),
  ('26056ab1-9d30-41ed-ae7e-e44f147ef860', '{ai,books,christmas-gifts,new-year-setup}', 'Books | AI: Understand the Revolution: From Basics and Buzzwords to Tech Giants, Governments, and Your Future'),
  ('8f939346-63f0-4671-bbe0-91063b4ce927', '{ai,books,christmas-gifts,new-year-setup}', 'Books | AI... Meets... AI: An Exciting Tale of Connection and Adventure (AiDigiTales: Artificial Intelligence for Kids A'),
  ('85d66b9c-94a9-4f07-a20e-065c04b820cf', '{ai,books,christmas-gifts,new-year-setup}', 'Books | Master AI for Beginners: Develop Artificial Intelligence Basics, Understand Machine Learning, and Unlock the Pow'),
  ('ca827298-f8ac-4aa5-b985-da017701d5e9', '{ai,books,christmas-gifts,new-year-setup}', 'Books | The 30-Day Productivity Plan: Break The 30 Bad Habits That Are Sabotaging Your Time Management - One Day At A Ti'),
  ('62850da2-5ca7-4a80-b0b9-8e2afe517a9b', '{ai,books,christmas-gifts,new-year-setup}', 'Books | The Hardware Hacking Handbook: Breaking Embedded Security with Hardware Attacks'),
  ('599ba977-0859-4a9f-9100-9c21a33afd80', '{ai,books,christmas-gifts,new-year-setup}', 'Books | Ultimate Microsoft Power Automate Desktop: Leverage Microsoft''s Robotic Process Automation Capabilities to Autom'),
  ('a2ab8af6-2971-49db-92fe-e72fe7bf9ad2', '{ai,books,christmas-gifts,new-year-setup}', 'Books | Workflow Automation with Microsoft Power Automate: Design and scale AI-powered cloud and desktop workflows using'),
  ('bb6f6d20-a4e5-4145-95ce-78b41a3eb0e7', '{technology,thanksgiving-week,cyber-monday,christmas-gifts}', 'Cables & Chargers | Anker USB-C to USB-C 60W Fast Charging Cable (2-Pack)'),
  ('8dd58ad5-b9ba-4ef5-b751-e7aa6525682f', '{technology,thanksgiving-week,cyber-monday,christmas-gifts}', 'Cables & Chargers | INIU 10000mAh 45W Fast Charging Portable Power Bank'),
  ('aff5374d-8f63-4754-8de9-8c31ef45184e', '{technology,thanksgiving-week,cyber-monday,christmas-gifts}', 'Cleaning & Care | Screen Mom Screen Cleaner Spray (16oz)'),
  ('797c558d-fd73-44d6-861a-11a12ea386dd', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Creative Tools | HUION Inspiroy 2 Large Drawing Tablet with 3-Group 8 Customized ExpressKeys'),
  ('bb6cbf3d-c6eb-4b80-ba8c-3153448a0d3d', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Creative Tools | Wacom Intuos Small, Wired Graphic Drawing Tablet with Pen + Software'),
  ('685a9977-e47a-41a5-81ad-6925b4b0768a', '{ai,books,christmas-gifts,new-year-setup}', 'Cybersecurity (Books) | Cybersecurity Law'),
  ('966ea5c7-d42c-474e-980b-2fbb58841b62', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Desk Setup | OMOTON C2 Adjustable Aluminum Phone Stand'),
  ('1fe0b293-0f11-4e64-bcdd-bed27937f683', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Desk Setup | Vari VariDesk Pro Plus 36 Standing Desk Converter – 11 Height Settings + Spring Lift, 2 Tier Design, Keyboa'),
  ('066d7468-3b39-4cde-a7ce-881fb7d15a1e', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Desk Setup | VERSADESK PowerPro 36 Inch Electric Corner Standing Desk Converter, Push-Button Height Adjustable Sit to St'),
  ('587dd75b-26f2-4bf8-bf04-4642301e958e', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Desk Setup | VIVO Black 26 in Single Top Standing Desk Converter, DESK-V001J | Ultra-Slim, Height Adjustable Desk Riser,'),
  ('35888e48-3c38-4da6-90f3-b5ba1d894fbb', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Docking & Hubs | Anker Laptop Docking Station Dual Monitor, 8-in-1 USB C Hub with 4K HDMI'),
  ('a2b39ea9-6429-4836-9f90-9b522f15fb8d', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Docking & Hubs | Anker USB C Hub, 5-in-1 USBC to HDMI Splitter with 4K Display | 85W Max PD, 1 Powered USB-C 5Gbps & 2 P'),
  ('0408f074-638b-403b-aa92-dc8a30acc3a0', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Docking & Hubs | Anker USB C Hub, 7in1 Multi-Port USB Adapter, 4K@60Hz USBC to HDMI Splitter | 85W Max PD, 2 USB 3.0 & 1'),
  ('d5173a4e-7e9e-4509-bf6d-e05d9c985511', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Docking & Hubs | Dell Pro Laptop Docking Station WD25, USB-C, 100W, DisplayPort, HDMI | Universal Dock, Ethernet, USB-A '),
  ('1d23dc83-b49a-4e10-bc90-4cca8e6c83d4', '{technology,thanksgiving-week,cyber-monday,christmas-gifts}', 'Everyday Carry | Stanley Quencher H2.0 Tumbler 30oz'),
  ('66afc5ca-7dec-4fd1-bbf5-a336fa12d707', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Input Devices | AOC Ergonomic Mouse, 2.4GHz Wireless Bluetooth Vertical Mouse, Rechargeable | 4800 DPI, Right Hand, Quie'),
  ('4e672c09-d800-4a92-a234-0fc48a56ee6a', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Input Devices | Logitech MX Vertical Wireless Mouse Ergonomic Design - Graphite'),
  ('b9762229-ff42-43a8-b4d3-44157ba1007c', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Input Devices | TECKNET Wireless Mouse, 2.4G Ergonomic Computer Mouse, 2600 DPI, Black | Ergonomic Design with Side Grip'),
  ('4b2ee344-8406-471e-ad7c-950a711b340d', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Input Devices | VSD M18 Macro Pad Programmable Keypad, Stream Controller Streaming Deck, Customizable LCD keys, Gaming s'),
  ('0b39cf4a-67f0-4362-8fb1-efe8a76f04d9', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Keyboards | AULA F99 Wireless Mechanical Keyboard,Tri-Mode BT5.0/2.4GHz/USB-C Hot Swappable Custom Keyboard,Pre-lubed Li'),
  ('ad71b315-1fd0-4a09-97b7-1806a3c1a3ae', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Keyboards | Logitech Ergo K860 Wireless Ergonomic Split Keyboard with Wrist Rest'),
  ('ceb960fe-3b42-4a79-9351-e0ee644047ad', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Keyboards | Logitech G413 SE Full-Size Mechanical Gaming Keyboard - Black | Backlit, anti-ghosting, compatible with Wind'),
  ('b9ac8da7-f19c-41b5-a2d7-46d09352a8d6', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Keyboards | Logitech Wave Keys Ergonomic Wireless Keyboard with Palm Rest'),
  ('497b0d23-3f6d-4173-bd5d-dff4a7ee6f8d', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Keyboards | Perixx PERIBOARD-512B Wired Ergonomic Keyboard - Split Keyboard, Wrist Rest'),
  ('4db74ea5-0597-4520-91a5-57d8f4aa86b0', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Keyboards | RK ROYAL KLUDGE R98 Pro Wired Mechanical Keyboard, 96% Creamy Gaming Keyboard RGB Backlit with Number Pad an'),
  ('9eeefb82-a80b-4caa-b295-8574d9b0ffdc', '{ai,books,christmas-gifts,new-year-setup}', 'LLMs (Books) | Build a Large Language Model (From Scratch)'),
  ('890387d2-99cb-4934-a303-f4a6b85fec97', '{ai,books,christmas-gifts,new-year-setup}', 'LLMs (Books) | LLM Inference Engineering Handbook: Crush API Costs, Cut Latency and Build Reliable Production Systems — '),
  ('81006658-7c5f-467f-b924-d355120d9536', '{ai,books,christmas-gifts,new-year-setup}', 'Machine Learning (Books) | Deep Learning (Adaptive Computation and Machine Learning series)'),
  ('19056c83-78aa-4f53-93d9-4d92ffc93985', '{ai,books,christmas-gifts,new-year-setup}', 'Machine Learning (Books) | Machine Learning with PyTorch and Scikit-Learn'),
  ('2c655e5b-6c9e-44fc-a8c6-7583208196ff', '{ai,books,christmas-gifts,new-year-setup}', 'Machine Learning (Books) | Python Machine Learning By Example: Unlock machine learning best practices with real-world us'),
  ('ec800252-7b26-438d-a231-569cd3276fd4', '{ai,books,christmas-gifts,new-year-setup}', 'Machine Learning (Books) | Understanding Deep Learning'),
  ('dd6d1602-b10f-4c8f-bcee-9e52426d9295', '{technology,desk,thanksgiving-week,black-friday,new-year-setup}', 'Monitors | Alienware 34 Curved Gaming Monitor – AW3425DWM - 34-inch WQHD 180Hz 1ms Display, 1500R, AMD FreeSync Premium,'),
  ('0b7fe34e-d9d4-4539-8747-28245f059073', '{technology,desk,thanksgiving-week,black-friday,new-year-setup}', 'Monitors | AOC Portable Monitor 15.6'''' FHD 125% sRGB 1080P IPS Travel Monitor'),
  ('476c602c-4a61-44c6-b90d-70794f547362', '{technology,desk,thanksgiving-week,black-friday,new-year-setup}', 'Monitors | cocopar Portable Monitor 15.6 Inch 1080P FHD 60Hz 85% sRGB Travel Monitor'),
  ('6f7aaeef-e6b7-4288-a932-f141a8775b50', '{technology,desk,thanksgiving-week,black-friday,new-year-setup}', 'Monitors | KYY Portable Monitor 15.6" 1080P Computer Monitor Screen Extender'),
  ('18fc06a5-8c0e-43c4-bcfd-3b8d720e6217', '{technology,desk,thanksgiving-week,black-friday,new-year-setup}', 'Monitors | LG 34WN80C-B UltraWide Monitor 34” 21:9 Curved WQHD (3440 x 1440) IPS Display, USB Type-C (60W PD), sRGB 99% '),
  ('02020d97-3811-4f2b-bc1a-427f4c1d8e5a', '{technology,desk,thanksgiving-week,black-friday,new-year-setup}', 'Monitors | LG 34WR55QK-B 34-inch UltraWide WQHD (3440 x 1440) Curved Computer Monitor, 100Hz, 5ms, HDR10, Reader Mode, H'),
  ('f8cf0178-d060-4e37-9ff7-155b7ee794e8', '{technology,desk,thanksgiving-week,black-friday,new-year-setup}', 'Monitors | LG 38WN75C-B Monitor 38" 21:9 Curved UltraWide QHD+ (3840 x 1600) IPS Display, HDR 10, sRGB 99% Color Gamut, '),
  ('281756d6-6023-4e6d-ae61-eecf2f2842d0', '{ai,books,christmas-gifts,new-year-setup}', 'Open Source (Books) | Open (Source) for Business: A Practical Guide to Open Source Software Licensing - Third Edition'),
  ('bf2eb999-1223-4801-acf6-fd1383dc2ab3', '{ai,books,christmas-gifts,new-year-setup}', 'Software Engineering (Books) | The Pragmatic Programmer: 20th Anniversary Edition, 2nd Edition: Your Journey to Mastery'),
  ('3bcb4e07-249a-4c15-899e-2a74481b5a4d', '{technology,ai,thanksgiving-week,black-friday,cyber-monday,christmas-gifts}', 'Storage | Samsung T7 Shield Portable SSD 2TB, USB 3.2 Gen 2, Rugged IP65'),
  ('ac5e5c10-f739-4ec6-ac19-661ce9a38786', '{technology,ai,thanksgiving-week,black-friday,cyber-monday,christmas-gifts}', 'Storage | Sandisk 2TB Extreme Portable SSD, Up to 1050MB/s Read Speeds'),
  ('291a6660-6a75-4280-befc-a31c06f2b7a4', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Webcams | EMEET NOVA 4K Webcam for PC, Ultra 4K HD, PDAF Autofocus, Dual Omni Mics | 73° FOV, Auto Light Correction, USB'),
  ('6c305b2e-3ba7-4e7a-9c98-a89bcadbbfe4', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Webcams | Insta360 Link 2 - PTZ 4K Webcam for PC/Mac, 1/2" Sensor, AI Tracking, HDR, AI Noise-Canceling Mic, Gesture Con'),
  ('7d98ab51-4a15-440d-9cc3-d00d30e8f1a8', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Webcams | Logitech Brio 101 Full HD 1080p Webcam for Streaming and Meetings'),
  ('6b8eb8e4-0f02-4bdf-9ab9-ae5e2be72098', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Webcams | Logitech Brio Ultra 4K HD Webcam for Streaming and Meetings - Black | Ultra HD with glass lens, auto light cor'),
  ('a758efad-4536-4e95-9c82-567191f3acbf', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Webcams | Logitech C920x HD Pro PC Webcam Full 1080p/30fps Video'),
  ('00ddcb77-9be4-4f07-9112-94d1db814d30', '{technology,desk,thanksgiving-week,black-friday,cyber-monday,christmas-gifts,new-year-setup}', 'Webcams | NexiGo N60 1080P Webcam with Microphone, Software Control & Privacy Cover'),
  ('2f87ebbd-4a19-491d-87d7-230e2ac667df', '{technology,thanksgiving-week,cyber-monday,christmas-gifts}', 'Wellness & Ergonomics | livho Blue Light Blocking Computer Glasses')
on conflict (product_id) do nothing;

-- How to manage it afterwards (examples, run when you want them):
--   Add a product:      insert into deals_catalog (product_id, tags) values ('<affiliate_products.id>', '{technology,ai,christmas-gifts}');
--   Pin to the top:     update deals_catalog set pinned_rank = 1, updated_at = now() where product_id = '<id>';
--   Hide for now:       update deals_catalog set hidden = true, updated_at = now() where product_id = '<id>';
--   Change its tags:    update deals_catalog set tags = '{books,ai,christmas-gifts}', updated_at = now() where product_id = '<id>';
-- Changes show up within about 6 hours (the page data is cached), or right away after a deploy.
