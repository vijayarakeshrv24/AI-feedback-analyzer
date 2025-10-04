import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Sparkles, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DigestPreview = () => {
  const [digest, setDigest] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClustering, setIsClustering] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data } = await supabase
        .from("digest_history")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(5);

      setHistory(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const handleCluster = async () => {
    setIsClustering(true);
    try {
      const { data, error } = await supabase.functions.invoke("cluster-feedback");

      if (error) throw error;

      toast({
        title: "Clustering complete",
        description: `Created ${data.clustersCreated} clusters from ${data.totalFeedback} feedback entries.`,
      });
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

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-digest");

      if (error) throw error;

      setDigest(data.digest);
      toast({
        title: "Digest generated",
        description: "Weekly insights have been created successfully.",
      });

      await loadHistory();
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate digest",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Weekly Digest Generator
              </CardTitle>
              <CardDescription className="mt-2">
                AI-powered summary of top feedback for your team
              </CardDescription>
            </div>
            <div className="flex gap-2">
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
                    <Brain className="h-4 w-4" />
                    Cluster Feedback
                  </>
                )}
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Digest
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {digest && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Latest Digest</CardTitle>
            <CardDescription>Generated just now</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap bg-muted p-4 rounded-lg">
                {digest}
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="gap-2">
                <Mail className="h-4 w-4" />
                Send via Email
              </Button>
              <Button variant="outline">Send to Slack</Button>
              <Button variant="outline">Send to Notion</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Digest History</CardTitle>
            <CardDescription>Previously generated digests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {new Date(item.sent_at).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <div className="flex gap-1">
                      {item.channels?.map((channel: string) => (
                        <span
                          key={channel}
                          className="text-xs px-2 py-1 bg-primary/10 text-primary rounded"
                        >
                          {channel}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!digest && history.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
            <Sparkles className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-lg font-medium">No digests yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Generate your first weekly digest to see it here
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DigestPreview;