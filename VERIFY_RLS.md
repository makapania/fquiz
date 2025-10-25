# Verify RLS Policies

Run this query in **Supabase Dashboard → SQL Editor** to verify all policies exist:

```sql
SELECT
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('sets', 'cards', 'questions')
ORDER BY tablename, policyname;
```

## Expected Results:

You should see these policies for the `sets` table:
- `delete_sets_all` (cmd: DELETE)
- `insert_sets_all` (cmd: INSERT)
- `read_published_sets_public` (cmd: SELECT)
- `update_sets_all` (cmd: UPDATE)

For `cards` table:
- `delete_cards_all` (cmd: DELETE)
- `insert_cards_all` (cmd: INSERT)
- `read_cards_when_set_published` (cmd: SELECT)
- `update_cards_all` (cmd: UPDATE)

For `questions` table:
- `delete_questions_all` (cmd: DELETE)
- `insert_questions_all` (cmd: INSERT)
- `read_questions_when_set_published` (cmd: SELECT)
- `update_questions_all` (cmd: UPDATE)

## If ANY are missing, re-run the migration:

Run this in SQL Editor:

```sql
-- Only run if policies are missing!

-- Sets table policies
CREATE POLICY IF NOT EXISTS insert_sets_all
  ON sets FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS update_sets_all
  ON sets FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS delete_sets_all
  ON sets FOR DELETE
  TO public
  USING (true);

-- Cards table policies
CREATE POLICY IF NOT EXISTS insert_cards_all
  ON cards FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS update_cards_all
  ON cards FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS delete_cards_all
  ON cards FOR DELETE
  TO public
  USING (true);

-- Questions table policies
CREATE POLICY IF NOT EXISTS insert_questions_all
  ON questions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS update_questions_all
  ON questions FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS delete_questions_all
  ON questions FOR DELETE
  TO public
  USING (true);
```

## Test If Service Role Key Bypasses RLS:

The service role key should **completely bypass RLS**, so even if policies are missing, it should work.

If you're still getting RLS errors with the service role key, the issue is that:
1. The key isn't actually the service role key (might be anon key by mistake)
2. The environment variable isn't being read in Vercel
3. There's a caching issue in Vercel
