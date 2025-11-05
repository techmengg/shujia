DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'AuthAttempt_lookup_idx'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER INDEX "AuthAttempt_lookup_idx" RENAME TO "AuthAttempt_type_scope_hash_createdAt_idx"';
  END IF;
END
$$;
