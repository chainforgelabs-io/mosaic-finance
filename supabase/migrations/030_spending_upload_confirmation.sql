-- Spending uploads: mark AI-suggested categories until the user confirms them,
-- and let logged-in users store their own files in the documents bucket.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS category_confirmed BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.transactions.category_confirmed IS
  'False when a category was suggested from an upload and the user has not confirmed it.';

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users insert own document files'
  ) THEN
    CREATE POLICY "Users insert own document files"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'documents'
        AND (storage.foldername(name))[1] IN ('spending', 'statements')
        AND (storage.foldername(name))[2] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users read own document files'
  ) THEN
    CREATE POLICY "Users read own document files"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'documents'
        AND (storage.foldername(name))[1] IN ('spending', 'statements')
        AND (storage.foldername(name))[2] = auth.uid()::text
      );
  END IF;
END $$;
