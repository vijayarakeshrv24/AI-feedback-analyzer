import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Cluster {
  id: string;
  name: string;
  description: string | null;
  feedback_count: number;
  created_at: string;
}

const ClusterView = () => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClustering, setIsClustering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    try {
      const { data, error } = await supabase
        .from("feedback_clusters")
        .select("*")
        .order("feedback_count", { ascending: false });

      if (error) throw error;
      setClusters(data || []);
    } catch (error) {
      console.error("Error loading clusters:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCluster = async () => {
    setIsClustering(true);
    try {
      const { error } = await supabase.functions.invoke("cluster-feedback");

      if (error) throw error;

      toast({
        title: "Clustering complete",
        description: "Feedback has been grouped into similar clusters.",
      });

      await loadClusters();
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to cluster feedback",
        variant: "destructive",
      });
    } finally {
      setIsClustering(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Feedback Clusters
              </CardTitle>
              <CardDescription className="mt-2">
                AI-powered grouping of similar feedback 
              </CardDescription>
            </div>
            <Button
              onClick={handleCluster}
              disabled={isClustering}
              variant="outline"
              className="gap-2"
            >
              {isClustering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Clustering...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Re-cluster
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {clusters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
            <Users className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-lg font-medium">No clusters yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload some feedback and run clustering to group similar entries
              </p>
            </div>
            <Button onClick={handleCluster} disabled={isClustering}>
              {isClustering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clustering...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Start Clustering
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clusters.map((cluster) => (
            <Card key={cluster.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{cluster.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {cluster.description || "No description available"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {cluster.feedback_count} items
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(cluster.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClusterView;
