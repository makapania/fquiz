# Applying Database Migrations

## Quick Fix for RLS Errors

If you're getting "new row violates row-level security policy" errors, you need to apply migration `0004_rls_insert_policies.sql`.

### Method 1: Via Supabase Dashboard (Easiest)

1. Go to your **Supabase Dashboard**
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the contents of `supabase/migrations/0004_rls_insert_policies.sql`
6. Click **Run** (or press Cmd/Ctrl + Enter)

### Method 2: Via Supabase CLI

If you have the Supabase CLI installed locally:

```bash
# Make sure you're linked to your project
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push
```

## What This Migration Does

The `0004_rls_insert_policies.sql` migration adds missing RLS policies for INSERT, UPDATE, and DELETE operations on:
- `sets` table
- `cards` table
- `questions` table

Without these policies, users and the service role couldn't create or modify content, even though the service role key should bypass RLS.

## Verifying It Worked

After applying the migration:
1. Try creating a new quiz or flashcard set
2. You should no longer see RLS policy errors
3. Manual question/card creation should work

## Future: Restricting Policies

Currently, the policies allow anyone to INSERT/UPDATE/DELETE. In the future, you may want to restrict these based on:
- Authentication status (only authenticated users)
- Ownership (only creators can edit their own content using the `created_by` field)

Example restricted policy:
```sql
CREATE POLICY update_own_sets
  ON sets FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
```
