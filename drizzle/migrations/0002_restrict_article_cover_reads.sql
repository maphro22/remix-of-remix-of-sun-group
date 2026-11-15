DROP POLICY IF EXISTS "Public reads article covers" ON storage.objects;

CREATE POLICY "Anyone reads covers of published articles" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'article-covers'
  AND EXISTS (
    SELECT 1 FROM public.articles a
    WHERE a.cover_url = storage.objects.name
      AND a.status = 'published'
  )
);

CREATE POLICY "Team reads all article covers" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'article-covers' AND public.is_team(auth.uid()));