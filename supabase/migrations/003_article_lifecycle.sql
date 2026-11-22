ALTER TABLE articles ADD COLUMN withdrawal_effective_at TIMESTAMPTZ;
ALTER TABLE article_versions ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION snapshot_article_version() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO article_versions(article_id, version_number, title, content)
  VALUES (NEW.id, NEW.version_number, NEW.title, NEW.content);
  RETURN NEW;
END;
$$;

CREATE FUNCTION prepare_article_version() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.version_number := 1;
  ELSIF (NEW.title, NEW.content) IS DISTINCT FROM (OLD.title, OLD.content)
     OR (OLD.status = 'requires_revision' AND NEW.status = 'pending_review') THEN
    NEW.version_number := OLD.version_number + 1;
    NEW.freshness_status := 'current';
    NEW.freshness_checked_at := NULL;
    NEW.freshness_notes := NULL;
  ELSE
    NEW.version_number := OLD.version_number;
  END IF;
  RETURN NEW;
END;
$$;

UPDATE articles SET version_number = 1 WHERE version_number IS NULL;
INSERT INTO article_versions(article_id, version_number, title, content, created_at)
SELECT id, version_number, title, content, COALESCE(updated_at, created_at, now()) FROM articles
ON CONFLICT (article_id, version_number) DO NOTHING;
CREATE TRIGGER prepare_article_version BEFORE INSERT OR UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION prepare_article_version();
CREATE TRIGGER snapshot_new_article AFTER INSERT ON articles
FOR EACH ROW EXECUTE FUNCTION snapshot_article_version();
CREATE TRIGGER snapshot_updated_article AFTER UPDATE ON articles
FOR EACH ROW WHEN (OLD.version_number IS DISTINCT FROM NEW.version_number)
EXECUTE FUNCTION snapshot_article_version();

CREATE FUNCTION complete_article_withdrawals() RETURNS void LANGUAGE sql AS $$
  UPDATE articles SET status = 'withdrawn', licensing_status = 'withdrawn'
  WHERE withdrawal_effective_at <= now() AND status <> 'withdrawn';
$$;

CREATE FUNCTION refresh_article_freshness() RETURNS void LANGUAGE sql AS $$
  UPDATE articles a SET freshness_checked_at = now(),
    freshness_status = CASE
      WHEN v.created_at <= now() - interval '365 days' THEN 'outdated'
      WHEN v.created_at <= now() - interval '180 days' THEN 'aging'
      ELSE 'current' END,
    freshness_notes = CASE
      WHEN v.created_at <= now() - interval '365 days' THEN 'This version is at least 365 days old and is excluded from search.'
      WHEN v.created_at <= now() - interval '180 days' THEN 'This version is at least 180 days old. Review it for accuracy.'
      ELSE NULL END
  FROM article_versions v
  WHERE v.article_id = a.id AND v.version_number = a.version_number
    AND a.status = 'approved' AND a.licensing_status = 'active'
    AND a.freshness_status IN ('current', 'aging', 'outdated');
$$;

REVOKE EXECUTE ON FUNCTION complete_article_withdrawals(), refresh_article_freshness() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION complete_article_withdrawals(), refresh_article_freshness() TO service_role;

CREATE FUNCTION resubmit_article(p_article_id uuid, p_creator_id uuid, p_title text, p_content text)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  UPDATE articles SET title = p_title, content = p_content,
    word_count = cardinality(regexp_split_to_array(trim(p_content), '\s+')),
    status = 'pending_review', submitted_at = clock_timestamp(), composite_quality_score = NULL,
    originality_score = NULL, ai_probability_score = NULL,
    revision_instructions = NULL, rejection_reason = NULL, reviewed_by = NULL,
    last_reviewed_at = NULL
  WHERE id = p_article_id AND creator_id = p_creator_id AND status = 'requires_revision';
  IF NOT FOUND THEN RETURN false; END IF;
  DELETE FROM article_quality_scores WHERE article_id = p_article_id;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION resubmit_article(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resubmit_article(uuid, uuid, text, text) TO service_role;
