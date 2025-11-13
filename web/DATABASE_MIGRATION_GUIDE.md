# 🗄️ Database Migration Guide: Local → Production

## 📋 Overview

When you make changes to your database schema (add tables, columns, etc.), you need to:
1. Create a migration locally
2. Test it locally
3. Deploy it to production

---

## 🔄 The Complete Workflow

### Step 1: Make Schema Changes Locally

Edit your Prisma schema file:
```
web/prisma/schema.prisma
```

**Example:** Adding a new field to the User model:
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String   @unique
  // NEW FIELD:
  bio       String?  // Optional bio field
  createdAt DateTime @default(now())
}
```

---

### Step 2: Create a Migration

Run this command to create a migration:

```powershell
cd C:\Users\aingt\dev\shujia\web
npx prisma migrate dev --name add_user_bio
```

**What this does:**
- ✅ Creates a new migration file in `prisma/migrations/`
- ✅ Applies the migration to your local database
- ✅ Regenerates Prisma Client
- ✅ Creates SQL that can be run on production

**Example output:**
```
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "shujia_dev", schema "public" at "localhost:5432"

Applying migration `20251113120000_add_user_bio`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20251113120000_add_user_bio/
    └─ migration.sql

Your database is now in sync with your schema.
```

---

### Step 3: Review the Migration File

Check the generated SQL:
```
web/prisma/migrations/20251113120000_add_user_bio/migration.sql
```

**Example content:**
```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
```

**Important:** Review this to make sure it's safe!
- ✅ Adding columns with `?` (optional) is safe
- ⚠️ Adding required columns needs default values
- ⚠️ Dropping columns loses data
- ⚠️ Renaming columns needs careful handling

---

### Step 4: Test Locally

1. **Test your app:**
   ```powershell
   npm run dev
   ```

2. **Test with real data:**
   - Create test users
   - Try all features
   - Make sure nothing breaks

3. **Test the migration can be re-applied:**
   ```powershell
   # Reset database and re-run all migrations
   npx prisma migrate reset
   # This will ask for confirmation
   ```

---

### Step 5: Commit the Migration

```powershell
git add prisma/schema.prisma
git add prisma/migrations/
git commit -m "Add bio field to User model"
git push origin main
```

**What gets committed:**
- ✅ `prisma/schema.prisma` (your schema changes)
- ✅ `prisma/migrations/` (the SQL migration files)
- ❌ `.env` (never commit this!)

---

### Step 6: Deploy to Production

When you push to GitHub, Vercel will automatically:

1. **Run your build:**
   ```bash
   npm run build
   ```

2. **Run migrations during build:**
   ```bash
   npx prisma generate  # (from prebuild script)
   ```

3. **Apply migrations on first request:**
   - Prisma will automatically apply pending migrations
   - OR you can manually trigger it (see below)

---

## 🚀 Manual Production Migration (Recommended)

For safer deployments, manually apply migrations before deploying:

### Option A: Using Vercel CLI

```powershell
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Run migrations on production
vercel env pull .env.production.local
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### Option B: Using Vercel Dashboard

1. Go to your Vercel project
2. Go to **Settings** → **Environment Variables**
3. Copy your `DATABASE_URL` (production)
4. Temporarily add it to your local `.env.production.local`:
   ```env
   DATABASE_URL="your-production-database-url"
   ```
5. Run migration:
   ```powershell
   npx prisma migrate deploy
   ```
6. **Delete** `.env.production.local` immediately!

### Option C: Using a Migration Script

Create `web/scripts/migrate-production.ps1`:
```powershell
# Load production DATABASE_URL from Vercel
$env:DATABASE_URL = "your-production-url-here"

# Run migrations
npx prisma migrate deploy

# Clear the variable
$env:DATABASE_URL = ""
```

Then run:
```powershell
cd C:\Users\aingt\dev\shujia\web\scripts
.\migrate-production.ps1
```

---

## ⚠️ Important Safety Rules

### ✅ DO:
- ✅ Always test migrations locally first
- ✅ Review the generated SQL before deploying
- ✅ Make migrations backward-compatible when possible
- ✅ Add new columns as optional (`?`) first
- ✅ Commit migrations with your code changes
- ✅ Back up production database before major changes

### ❌ DON'T:
- ❌ Never edit old migration files
- ❌ Never run `prisma migrate reset` on production
- ❌ Never run `prisma db push` on production
- ❌ Don't add required fields without defaults
- ❌ Don't drop columns without a plan to preserve data
- ❌ Don't commit `.env` or `.env.production`

---

## 🔄 Common Migration Scenarios

### Adding a New Table

```prisma
model BlogPost {
  id        String   @id @default(cuid())
  title     String
  content   String
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}
```

```powershell
npx prisma migrate dev --name add_blog_posts
```

### Adding an Optional Field

```prisma
model User {
  bio String?  // Optional, safe to add
}
```

```powershell
npx prisma migrate dev --name add_user_bio
```

### Adding a Required Field (with default)

```prisma
model User {
  role String @default("user")  // Required, but has default
}
```

```powershell
npx prisma migrate dev --name add_user_role
```

### Renaming a Field (preserving data)

**Step 1:** Add new field
```prisma
model User {
  displayName String?  // New field
  name        String?  // Old field (keep for now)
}
```

**Step 2:** Deploy and run data migration
```sql
UPDATE "User" SET "displayName" = "name" WHERE "displayName" IS NULL;
```

**Step 3:** Remove old field
```prisma
model User {
  displayName String?  // Keep
  // name removed
}
```

### Adding an Index

```prisma
model User {
  email String @unique
  
  @@index([email])  // Add index for faster lookups
}
```

```powershell
npx prisma migrate dev --name add_email_index
```

---

## 🛠️ Troubleshooting

### Migration fails on production?

1. **Check Vercel logs:**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the failed deployment
   - Check the build logs

2. **Common issues:**
   - Missing environment variables
   - Database connection timeout
   - Conflicting schema changes
   - Required fields without defaults

### Need to rollback?

**Option 1: Revert the code**
```powershell
git revert HEAD
git push origin main
```

**Option 2: Manual SQL (dangerous!)**
```sql
-- Only if you know what you're doing!
-- Connect to production database and run reverse SQL
ALTER TABLE "User" DROP COLUMN "bio";
```

### Database out of sync?

```powershell
# Check migration status
npx prisma migrate status

# Force sync (careful!)
npx prisma migrate resolve --applied "migration_name"
```

---

## 📊 Migration Checklist

Before deploying to production:

- [ ] Schema changes made in `prisma/schema.prisma`
- [ ] Migration created with `npx prisma migrate dev`
- [ ] Migration SQL reviewed and looks safe
- [ ] Tested locally with real data
- [ ] No breaking changes to existing data
- [ ] Migration files committed to git
- [ ] Code changes committed (if any)
- [ ] Pushed to GitHub
- [ ] (Optional) Manually ran migration on production
- [ ] Deployment successful
- [ ] Production site tested and working

---

## 🎯 Quick Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npx prisma migrate dev` | Create & apply migration locally | After schema changes |
| `npx prisma migrate deploy` | Apply migrations (no new ones) | Production deployment |
| `npx prisma migrate status` | Check migration status | Debugging |
| `npx prisma migrate reset` | Reset DB & reapply all | Local testing only! |
| `npx prisma db push` | Sync schema without migration | Prototyping only |
| `npx prisma studio` | View/edit data in GUI | Local development |
| `npx prisma generate` | Regenerate Prisma Client | After schema changes |

---

## 🔒 Production Database Safety

### Before Major Changes:

1. **Backup your database:**
   - Most hosting providers have automatic backups
   - Vercel Postgres: Go to Storage → Your DB → Backups
   - Or use `pg_dump` to create manual backup

2. **Test on a staging database:**
   - Create a copy of production data
   - Test migration on the copy first
   - Verify everything works

3. **Plan for downtime (if needed):**
   - Some migrations can run while app is live
   - Others might need brief downtime
   - Communicate with users if needed

---

## 📚 Learn More

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/migrate/production-troubleshooting)
- [Database Migration Strategies](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate)

---

**Remember: Always test locally first, review the SQL, and have a backup plan!** 🚀

