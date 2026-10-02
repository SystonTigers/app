-- Training sessions planned in the app: where, when, which drills, and who came.
ALTER TABLE training_plans ADD COLUMN start_time TEXT;
ALTER TABLE training_plans ADD COLUMN location TEXT;
ALTER TABLE training_plans ADD COLUMN notes TEXT;
-- JSON list of drill references: "lib:<id>" (built-in library) or "club:<id>" (club drill)
ALTER TABLE training_plans ADD COLUMN drill_refs TEXT;

CREATE TABLE IF NOT EXISTS training_attendance (
    tenant_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    present INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (tenant_id, plan_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_training_plans_date ON training_plans(tenant_id, scheduled_date);
