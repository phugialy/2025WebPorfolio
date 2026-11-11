-- Replace Amazon's placeholder logo with each product's real picture (2026-11-10).
-- Run in the Supabase SQL Editor. Safe to run twice: each update only touches a row that still has the placeholder.
-- Pictures were read from each product's own Amazon page and checked to be real JPEGs.
-- To undo one: set image_url back to 'https://m.media-amazon.com/images/G/01/share-icons/previewdoh/amazon.png' for that id.

begin;
-- OMOTON C2 Adjustable Aluminum Phone Stand  (was https://m.media-amazon.com/images/G/01/share-icons/previewdoh/amazon.png)
update affiliate_products set image_url = 'https://m.media-amazon.com/images/I/616-8VSyqdL.jpg', updated_at = now() where id = '966ea5c7-d42c-474e-980b-2fbb58841b62' and image_url like '%previewdoh%';

-- Screen Mom Screen Cleaner Spray (16oz)  (was https://m.media-amazon.com/images/G/01/share-icons/previewdoh/amazon.png)
update affiliate_products set image_url = 'https://m.media-amazon.com/images/I/71kY-wHCGtL.jpg', updated_at = now() where id = 'aff5374d-8f63-4754-8de9-8c31ef45184e' and image_url like '%previewdoh%';

-- Anker USB-C to USB-C 60W Fast Charging Cable (2-Pack)  (was https://m.media-amazon.com/images/G/01/share-icons/previewdoh/amazon.png)
update affiliate_products set image_url = 'https://m.media-amazon.com/images/I/71k0d1eTetL.jpg', updated_at = now() where id = 'bb6f6d20-a4e5-4145-95ce-78b41a3eb0e7' and image_url like '%previewdoh%';

-- livho Blue Light Blocking Computer Glasses  (was https://m.media-amazon.com/images/G/01/share-icons/previewdoh/amazon.png)
update affiliate_products set image_url = 'https://m.media-amazon.com/images/I/7126GsYr5dL.jpg', updated_at = now() where id = '2f87ebbd-4a19-491d-87d7-230e2ac667df' and image_url like '%previewdoh%';

-- INIU 10000mAh 45W Fast Charging Portable Power Bank  (was https://m.media-amazon.com/images/G/01/share-icons/previewdoh/amazon.png)
update affiliate_products set image_url = 'https://m.media-amazon.com/images/I/71UKiaeIN0L._AC_SL1500_.jpg', updated_at = now() where id = '8dd58ad5-b9ba-4ef5-b751-e7aa6525682f' and image_url like '%previewdoh%';

-- Stanley Quencher H2.0 Tumbler 30oz  (was https://m.media-amazon.com/images/G/01/share-icons/previewdoh/amazon.png)
update affiliate_products set image_url = 'https://m.media-amazon.com/images/I/51-U5dEbEBL._AC_SL1500_.jpg', updated_at = now() where id = '1d23dc83-b49a-4e10-bc90-4cca8e6c83d4' and image_url like '%previewdoh%';
commit;
