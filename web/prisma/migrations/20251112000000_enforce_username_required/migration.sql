-- Backfill usernames for any existing users missing a username
UPDATE "User" AS u
SET "username" = LOWER(
  REGEXP_REPLACE(
    COALESCE(NULLIF(TRIM(u."name"), ''), SPLIT_PART(u."email", '@', 1)),
    '[^a-zA-Z0-9_]+',
    '_',
    'g'
  )
) || '_' || SUBSTR(MD5(u."id"), 1, 6)
WHERE u."username" IS NULL OR u."username" = '';

-- Ensure resulting usernames meet minimum length of 3
UPDATE "User" AS u
SET "username" = 'user_' || SUBSTR(MD5(u."id"), 1, 6)
WHERE LENGTH(COALESCE(u."username", '')) < 3;

-- Make the username column required
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;


