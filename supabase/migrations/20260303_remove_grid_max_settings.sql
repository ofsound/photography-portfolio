-- Remove grid_desktop_max and grid_mobile_max from site_settings
-- These are now hardcoded to 20 for desktop, and mobile max is no longer used for zoom.

ALTER TABLE public.site_settings 
DROP COLUMN grid_desktop_max CASCADE,
DROP COLUMN grid_mobile_max CASCADE;
