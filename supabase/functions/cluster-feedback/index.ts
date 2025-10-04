import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Fetching feedback with embeddings...");

    // Get all feedback analysis with embeddings
    const { data: analyses, error: fetchError } = await supabase
      .from("feedback_analysis")
      .select(`
        id,
        feedback_id,
        embedding_vector,
        feedback:feedback_id (
          content
        )
      `)
      .not("embedding_vector", "is", null);

    if (fetchError) throw fetchError;

    if (!analyses || analyses.length === 0) {
      return new Response(
        JSON.stringify({ message: "No feedback with embeddings found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing ${analyses.length} feedback entries...`);

    // Parse embeddings
    const items = analyses.map(item => {
      const feedbackData = Array.isArray(item.feedback) ? item.feedback[0] : item.feedback;
      return {
        id: item.id,
        feedbackId: item.feedback_id,
        content: feedbackData?.content || "",
        embedding: JSON.parse(item.embedding_vector),
      };
    });

    // Simple clustering using similarity threshold
    const SIMILARITY_THRESHOLD = 0.75;
    const clusters: { [key: number]: any[] } = {};
    let clusterCount = 0;

    for (const item of items) {
      let assigned = false;

      // Try to assign to existing cluster
      for (const clusterId in clusters) {
        const cluster = clusters[clusterId];
        const representative = cluster[0];
        
        const similarity = cosineSimilarity(item.embedding, representative.embedding);
        
        if (similarity >= SIMILARITY_THRESHOLD) {
          cluster.push(item);
          assigned = true;
          break;
        }
      }

      // Create new cluster if not assigned
      if (!assigned) {
        clusters[clusterCount++] = [item];
      }
    }

    console.log(`Created ${clusterCount} clusters`);

    // Create cluster entries in database
    for (const clusterId in clusters) {
      const cluster = clusters[clusterId];
      const representative = cluster[0].content;
      
      // Generate cluster name (first few words of representative)
      const words = representative.split(" ").slice(0, 5).join(" ");
      const clusterName = `Cluster: ${words}...`;

      // Create cluster
      const { data: clusterData, error: clusterError } = await supabase
        .from("feedback_clusters")
        .insert({
          name: clusterName,
          description: representative.substring(0, 200),
          feedback_count: cluster.length,
        })
        .select()
        .single();

      if (clusterError) {
        console.error("Error creating cluster:", clusterError);
        continue;
      }

      // Update feedback_analysis with cluster_id
      const feedbackIds = cluster.map(item => item.id);
      const { error: updateError } = await supabase
        .from("feedback_analysis")
        .update({ cluster_id: clusterData.id })
        .in("id", feedbackIds);

      if (updateError) {
        console.error("Error updating cluster assignments:", updateError);
      }
    }

    console.log("Clustering complete");

    return new Response(
      JSON.stringify({ 
        success: true, 
        clustersCreated: clusterCount,
        totalFeedback: items.length 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in cluster-feedback:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
