-- Migration: Consolidate stages to unified pipeline per photographer
-- This migration removes per-project-type stage pipelines and creates ONE unified pipeline
--
-- Strategy: Keep the default project type's stages, remap all other projects/automations
-- to those stages by orderIndex, then delete the duplicate stages

-- Step 1: Create function to consolidate stages for a single photographer
CREATE OR REPLACE FUNCTION consolidate_stages_for_photographer(p_photographer_id VARCHAR)
RETURNS void AS $$
DECLARE
    default_project_type VARCHAR;
    other_stage RECORD;
    target_stage_id VARCHAR;
BEGIN
    -- Find default project type (or first one by created order)
    SELECT slug INTO default_project_type
    FROM project_types
    WHERE photographer_id = p_photographer_id
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1;

    -- If no project types exist, nothing to consolidate
    IF default_project_type IS NULL THEN
        RETURN;
    END IF;

    -- For each stage in OTHER project types, remap by orderIndex
    FOR other_stage IN
        SELECT s.id, s.order_index, s.project_type
        FROM stages s
        WHERE s.photographer_id = p_photographer_id
        AND s.project_type IS NOT NULL
        AND s.project_type != default_project_type
    LOOP
        -- Find matching keeper stage by order_index
        SELECT id INTO target_stage_id
        FROM stages
        WHERE photographer_id = p_photographer_id
        AND project_type = default_project_type
        AND order_index = other_stage.order_index
        LIMIT 1;

        IF target_stage_id IS NOT NULL THEN
            -- Remap projects
            UPDATE projects SET stage_id = target_stage_id
            WHERE stage_id = other_stage.id;

            -- Remap automations (trigger stage)
            UPDATE automations SET stage_id = target_stage_id
            WHERE stage_id = other_stage.id;

            -- Remap automations (target stage for move action)
            UPDATE automations SET target_stage_id = target_stage_id
            WHERE target_stage_id = other_stage.id;

            -- Remap automations (condition stage)
            UPDATE automations SET stage_condition = target_stage_id
            WHERE stage_condition = other_stage.id;

            -- Remap drip campaigns
            UPDATE drip_campaigns SET target_stage_id = target_stage_id
            WHERE target_stage_id = other_stage.id;

            -- Remap contacts (if they have a stage_id)
            UPDATE contacts SET stage_id = target_stage_id
            WHERE stage_id = other_stage.id;

            -- Delete the duplicate stage
            DELETE FROM stages WHERE id = other_stage.id;
        END IF;
    END LOOP;

    -- Clear projectType from remaining (keeper) stages
    UPDATE stages SET project_type = NULL
    WHERE photographer_id = p_photographer_id;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Execute migration for all photographers
DO $$
DECLARE
    photographer RECORD;
BEGIN
    FOR photographer IN SELECT id FROM photographers
    LOOP
        PERFORM consolidate_stages_for_photographer(photographer.id);
    END LOOP;
END $$;

-- Step 3: Clean up the function (optional - can keep for future use)
DROP FUNCTION IF EXISTS consolidate_stages_for_photographer(VARCHAR);

-- Step 4: Make projectType nullable (remove NOT NULL constraint and default)
-- Note: This is handled in schema, but ensure column allows NULL
ALTER TABLE stages ALTER COLUMN project_type DROP NOT NULL;
ALTER TABLE stages ALTER COLUMN project_type DROP DEFAULT;
