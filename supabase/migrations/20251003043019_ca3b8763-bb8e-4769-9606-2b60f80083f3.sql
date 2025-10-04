-- Create feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('csv', 'manual', 'api')),
  raw_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_email TEXT
);

-- Create feedback_analysis table
CREATE TABLE public.feedback_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  urgency TEXT NOT NULL CHECK (urgency IN ('high', 'medium', 'low')),
  impact TEXT NOT NULL CHECK (impact IN ('critical', 'feature_request', 'nice_to_have')),
  cluster_id UUID,
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  embedding_vector TEXT
);

-- Create feedback_clusters table
CREATE TABLE public.feedback_clusters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  feedback_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create digest_history table
CREATE TABLE public.digest_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  summary JSONB,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  channels TEXT[] DEFAULT ARRAY['email']::TEXT[]
);

-- Add foreign key for cluster_id in feedback_analysis
ALTER TABLE public.feedback_analysis 
  ADD CONSTRAINT fk_cluster 
  FOREIGN KEY (cluster_id) 
  REFERENCES public.feedback_clusters(id) 
  ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digest_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (demo purposes - adjust based on auth requirements)
CREATE POLICY "Allow public read access on feedback" 
  ON public.feedback FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert on feedback" 
  ON public.feedback FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public read access on feedback_analysis" 
  ON public.feedback_analysis FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert on feedback_analysis" 
  ON public.feedback_analysis FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public read access on feedback_clusters" 
  ON public.feedback_clusters FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert/update on feedback_clusters" 
  ON public.feedback_clusters FOR ALL 
  USING (true);

CREATE POLICY "Allow public read access on digest_history" 
  ON public.digest_history FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert on digest_history" 
  ON public.digest_history FOR INSERT 
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX idx_feedback_analysis_feedback_id ON public.feedback_analysis(feedback_id);
CREATE INDEX idx_feedback_analysis_cluster_id ON public.feedback_analysis(cluster_id);
CREATE INDEX idx_feedback_analysis_urgency ON public.feedback_analysis(urgency);
CREATE INDEX idx_feedback_analysis_sentiment ON public.feedback_analysis(sentiment);

-- Create trigger for updating feedback_clusters.updated_at
CREATE TRIGGER update_feedback_clusters_updated_at
  BEFORE UPDATE ON public.feedback_clusters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();