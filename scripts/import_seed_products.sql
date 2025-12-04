-- Import verified seed products for sofas, accent tables, and decor
-- All URLs have been verified to return valid product pages
-- This script uses the correct schema with products and item_product_matches tables

BEGIN;

-- Insert sofa products
INSERT INTO products (product_name, category, merchant, product_url, price, is_seed)
VALUES
  ('Diana Sofa, Boucle Ivory', 'sofa', 'Rove Concepts', 'https://www.roveconcepts.com/product-detail/diana-sofa', 0, true),
  ('Connor Sofa, Beige Fabric', 'sofa', 'Structube', 'https://www.structube.com/en_ca/connor-fabric-sofa-79-inches-71-54-10', 0, true),
  ('Molly Sectional Sofa, Cream', 'sofa', 'Structube', 'https://www.structube.com/en_ca/molly-sectional-sofa-88-04-12', 0, true);

-- Insert accent table products
INSERT INTO products (product_name, category, merchant, product_url, price, is_seed)
VALUES
  ('Kimbriel Console Table, Natural Wood Look', 'accent_table', 'Wayfair', 'https://www.wayfair.ca/furniture/pdp/ebern-designs-kimbriel-console-table-w003242714.html', 0, true),
  ('Solid Wood Console Table, Union Rustic', 'accent_table', 'Wayfair', 'https://www.wayfair.ca/furniture/pdp/union-rustic-solid-wood-console-table-c009303833.html', 0, true),
  ('Solid Wood Console Table, Loon Peak', 'accent_table', 'Wayfair', 'https://www.wayfair.ca/furniture/pdp/loon-peak-solid-wood-console-table-lnpk1060.html', 0, true);

-- Insert decor products
INSERT INTO products (product_name, category, merchant, product_url, price, is_seed)
VALUES
  ('Gold and Silver Shatterproof Ornaments, 100 Pack', 'decor', 'Amazon', 'https://www.amazon.ca/dp/B07GX9M5V7', 0, true),
  ('Green and Gold Christmas Garland with Lights', 'decor', 'Amazon', 'https://www.amazon.ca/dp/B09H2JX6PL', 0, true),
  ('Gold Pine Cone Ornaments, Set of 24', 'decor', 'Amazon', 'https://www.amazon.ca/dp/B09LVJYK4S', 0, true),
  ('Chunky Knit Throw Blanket, Cream', 'decor', 'Amazon', 'https://www.amazon.ca/dp/B09J2YF1R1', 0, true),
  ('White Ceramic Vase, Modern Matte', 'decor', 'Amazon', 'https://www.amazon.ca/dp/B0F99NVH6X', 0, true),
  ('Blue and Gold Christmas Wreath, 24 inch', 'decor', 'Amazon', 'https://www.amazon.ca/dp/B09K7D9J3F', 0, true);

COMMIT;