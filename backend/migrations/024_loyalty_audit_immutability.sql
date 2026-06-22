BEGIN;

CREATE OR REPLACE FUNCTION prevent_loyalty_audit_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Loyalty audit records are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS loyalty_points_audit_immutable
    ON loyalty_points_audit;
CREATE TRIGGER loyalty_points_audit_immutable
BEFORE UPDATE OR DELETE ON loyalty_points_audit
FOR EACH ROW EXECUTE FUNCTION prevent_loyalty_audit_mutation();

COMMIT;
