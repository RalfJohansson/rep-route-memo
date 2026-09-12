-- Rename strava_connections to user_integrations
ALTER TABLE public.strava_connections RENAME TO user_integrations;

-- Add provider column with default 'strava' for existing rows
ALTER TABLE public.user_integrations ADD COLUMN provider TEXT NOT NULL DEFAULT 'strava';

-- Rename athlete_id to provider_user_id
ALTER TABLE public.user_integrations RENAME COLUMN athlete_id TO provider_user_id;

-- Add scopes column
ALTER TABLE public.user_integrations ADD COLUMN scopes TEXT;

-- Drop the old unique constraint on user_id
ALTER TABLE public.user_integrations DROP CONSTRAINT user_integrations_user_id_key;

-- Add new unique constraint on (user_id, provider)
ALTER TABLE public.user_integrations ADD CONSTRAINT user_integrations_user_id_provider_key UNIQUE (user_id, provider);

-- Update RLS policies to use the new table name (they should still work because we renamed the table, but we need to update the policy definitions if they reference the old name? Actually, the policies are defined on the table, and we renamed the table, so the policies are now on the renamed table. However, the policy definitions still reference the old table name? Let's check: the policies were created on the table "strava_connections". After renaming, the policies are still attached to the table, but the table name changed. We need to alter the policies to reference the new table name? Actually, in PostgreSQL, when you rename a table, the policies are automatically updated to reference the new name. So we don't need to change the policies.

-- However, we do need to update the policies to check the provider? Actually, the policies are defined per table and they don't reference the provider column. They only check user_id. That's fine because we are still checking user_id. But note: the policies are defined as:
--   USING (auth.uid() = user_id);
-- This will still work because we are not changing the user_id column.

-- But we want to ensure that a user can only see their own integrations, which is already covered by the user_id check.

-- However, we also want to ensure that when we update or delete, we are only affecting the specific provider. The policies currently only check user_id, which means a user could update or delete any of their integrations (which is fine because they own them). But we want to restrict by provider as well? Actually, the user should be able to manage each of their integrations independently. The policies as they are (only checking user_id) are sufficient because the user can only see their own rows (due to the SELECT policy) and can only update/delete their own rows (due to the UPDATE/DELETE policies). Since the user can only see their own rows, they cannot see another user's integrations. And within their own rows, they can update or delete any of them (which is fine because they own them). However, we might want to restrict the update/delete to a specific provider? Actually, the user should be able to update or delete their Strava integration without affecting their Garmin integration. The current policies allow updating or deleting any row that belongs to the user, which is what we want.

-- So we don't need to change the policies.

-- But we do need to update the trigger function name? The trigger function is named `update_strava_connections_updated_at`. We should rename it to be more generic.

-- Rename the trigger function
ALTER FUNCTION public.update_strava_connections_updated_at RENAME TO update_user_integrations_updated_at;

-- Update the trigger to use the new function name
DROP TRIGGER IF EXISTS update_strava_connections_updated_at ON public.user_integrations;
CREATE TRIGGER update_user_integrations_updated_at
BEFORE UPDATE ON public.user_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_user_integrations_updated_at;

-- Update the default value for updated_at? The trigger already sets it.

-- Note: We are not changing the expires_at column type (still BIGINT). That's fine.

-- Comment
COMMENT ON TABLE public.user_integrations IS 'User connections to external services like Strava, Garmin, etc.';
COMMENT ON COLUMN public.user_integrations.provider IS 'The service provider (e.g., strava, garmin)';
COMMENT ON COLUMN public.user_integrations.provider_user_id IS 'The user ID from the provider (e.g., Strava athlete ID, Garmin user ID)';
COMMENT ON COLUMN public.user_integrations.scopes IS 'Comma-separated list of scopes granted by the provider';