-- Enable RLS on core tables
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Public can read published sets
CREATE POLICY read_published_sets_public
  ON sets FOR SELECT
  TO public
  USING (is_published = true);

-- Public can read cards/questions only when parent set is published
CREATE POLICY read_cards_when_set_published
  ON cards FOR SELECT
  TO public
  USING (EXISTS (SELECT 1 FROM sets s WHERE s.id = cards.set_id AND s.is_published = true));

CREATE POLICY read_questions_when_set_published
  ON questions FOR SELECT
  TO public
  USING (EXISTS (SELECT 1 FROM sets s WHERE s.id = questions.set_id AND s.is_published = true));