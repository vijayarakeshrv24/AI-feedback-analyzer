-- Fix security warning: Set search_path for update_updated_at_column function
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger that was dropped
CREATE TRIGGER update_feedback_clusters_updated_at
  BEFORE UPDATE ON public.feedback_clusters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();