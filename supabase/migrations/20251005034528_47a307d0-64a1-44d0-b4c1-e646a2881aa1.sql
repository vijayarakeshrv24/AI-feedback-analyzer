-- Add user_id to feedback table
ALTER TABLE feedback ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for feedback to be user-specific
DROP POLICY IF EXISTS "Allow public insert on feedback" ON feedback;
DROP POLICY IF EXISTS "Allow public read access on feedback" ON feedback;

CREATE POLICY "Users can insert their own feedback"
ON feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
ON feedback FOR SELECT
USING (auth.uid() = user_id);

-- Update RLS policies for feedback_analysis to be user-specific
DROP POLICY IF EXISTS "Allow public insert on feedback_analysis" ON feedback_analysis;
DROP POLICY IF EXISTS "Allow public read access on feedback_analysis" ON feedback_analysis;

CREATE POLICY "Users can view analysis of their own feedback"
ON feedback_analysis FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM feedback
    WHERE feedback.id = feedback_analysis.feedback_id
    AND feedback.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert feedback analysis"
ON feedback_analysis FOR INSERT
WITH CHECK (true);

-- Update RLS policies for feedback_clusters
DROP POLICY IF EXISTS "Allow public insert/update on feedback_clusters" ON feedback_clusters;
DROP POLICY IF EXISTS "Allow public read access on feedback_clusters" ON feedback_clusters;

CREATE POLICY "Users can view their own clusters"
ON feedback_clusters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM feedback_analysis fa
    JOIN feedback f ON f.id = fa.feedback_id
    WHERE fa.cluster_id = feedback_clusters.id
    AND f.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own clusters"
ON feedback_clusters FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM feedback_analysis fa
    JOIN feedback f ON f.id = fa.feedback_id
    WHERE fa.cluster_id = feedback_clusters.id
    AND f.user_id = auth.uid()
  )
);

-- Update digest_history to be user-specific
ALTER TABLE digest_history ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Allow public insert on digest_history" ON digest_history;
DROP POLICY IF EXISTS "Allow public read access on digest_history" ON digest_history;

CREATE POLICY "Users can view their own digests"
ON digest_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own digests"
ON digest_history FOR INSERT
WITH CHECK (auth.uid() = user_id);