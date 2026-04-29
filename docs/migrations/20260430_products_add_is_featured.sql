-- Add is_featured flag to products for editorial control of "Sản phẩm nổi bật"
-- on the mini-app home page.
--
-- Frontend usage: products.filter(p => p.is_featured).slice(0, 6)
-- Admin: toggle is_featured per product in the admin app.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial index speeds up the home query (small subset of rows).
CREATE INDEX IF NOT EXISTS idx_products_is_featured
  ON products (is_featured)
  WHERE is_featured = TRUE;

COMMENT ON COLUMN products.is_featured IS
  'Editorial flag: surface on the mini-app home page in "Sản phẩm nổi bật" section.';
