-- One current, non-revoked licensing agreement per creator.
UPDATE licensing_agreements la SET is_current = FALSE
WHERE is_current AND EXISTS (
  SELECT 1 FROM licensing_agreements newer
  WHERE newer.creator_id = la.creator_id AND newer.is_current
    AND (newer.agreed_at, newer.id) > (la.agreed_at, la.id)
);
CREATE UNIQUE INDEX IF NOT EXISTS licensing_agreements_one_current
  ON licensing_agreements(creator_id) WHERE is_current;
ALTER TABLE licensing_agreements ENABLE ROW LEVEL SECURITY;
