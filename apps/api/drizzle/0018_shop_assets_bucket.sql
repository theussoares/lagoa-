-- Bucket público de logos (leitura pública, escrita só pelo Nest com a service role). Já existe em produção
-- (criado fora do drizzle-kit); `ON CONFLICT DO NOTHING` deixa a migration idempotente. O Postgres puro do
-- Docker e da CI não tem o schema `storage` (é do Supabase), então ali ela não faz nada.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('shop-assets', 'shop-assets', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
