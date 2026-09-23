-- Account lockout (B2) — supports the "locked for 15 minutes" behaviour promised
-- by the sign-in error copy. Counter resets to 0 on successful login.
--
-- No index: the auth path finds the row by email (already unique-indexed) and
-- reads these columns off it, so they are never a search key.

ALTER TABLE "users" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "lockedUntil" TIMESTAMP(3);
