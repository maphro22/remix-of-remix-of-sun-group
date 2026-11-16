ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS cover_link text;
DROP POLICY IF EXISTS "Anyone reads covers of published articles" ON storage.objects;