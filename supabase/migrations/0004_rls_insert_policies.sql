-- Ensure idempotency: drop existing insert/update/delete policies before recreating
DROP POLICY IF EXISTS insert_sets_all ON sets;
DROP POLICY IF EXISTS update_sets_all ON sets;
DROP POLICY IF EXISTS delete_sets_all ON sets;

DROP POLICY IF EXISTS insert_cards_all ON cards;
DROP POLICY IF EXISTS update_cards_all ON cards;
DROP POLICY IF EXISTS delete_cards_all ON cards;

DROP POLICY IF EXISTS insert_questions_all ON questions;
DROP POLICY IF EXISTS update_questions_all ON questions;
DROP POLICY IF EXISTS delete_questions_all ON questions;

-- Add INSERT, UPDATE, DELETE policies for sets, cards, and questions
-- This allows server-side operations and authenticated users to manage content

-- Allow INSERT on sets for anyone (since we're using service role key on server)
CREATE POLICY insert_sets_all
  ON sets FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow UPDATE on sets for anyone (can be restricted later based on created_by)
CREATE POLICY update_sets_all
  ON sets FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Allow DELETE on sets for anyone (can be restricted later based on created_by)
CREATE POLICY delete_sets_all
  ON sets FOR DELETE
  TO public
  USING (true);

-- Allow INSERT on cards for anyone
CREATE POLICY insert_cards_all
  ON cards FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow UPDATE on cards for anyone
CREATE POLICY update_cards_all
  ON cards FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Allow DELETE on cards for anyone
CREATE POLICY delete_cards_all
  ON cards FOR DELETE
  TO public
  USING (true);

-- Allow INSERT on questions for anyone
CREATE POLICY insert_questions_all
  ON questions FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow UPDATE on questions for anyone
CREATE POLICY update_questions_all
  ON questions FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Allow DELETE on questions for anyone
CREATE POLICY delete_questions_all
  ON questions FOR DELETE
  TO public
  USING (true);
