import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Sparkles, Brain, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Markdown from "markdown-to-jsx"
const DigestPreview = () => {
  const [digest, setDigest] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClustering, setIsClustering] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedDigest, setSelectedDigest] = useState<any | null>(null);
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
      const { data, error } = await supabase.functions.invoke(
        "cluster-feedback"
      );
      if (error) throw error;

      toast({
        title: "Clustering complete",
        description: `Created ${data.clustersCreated} clusters from ${data.totalFeedback} feedback entries.`,
      });
    } catch (error: any) {
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
    // Check if user is logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "You must be logged in", variant: "destructive" });
      return;
    }

    // Check if there's any feedback in the database
    const { data: feedback, error: feedbackError } = await supabase
      .from("feedback")
      .select("id")
      .limit(1); // only need to know if any exist

    if (feedbackError) throw feedbackError;

    if (!feedback || feedback.length === 0) {
      toast({
        title: "No feedback available",
        description: "There is no feedback to generate a digest.",
        variant: "destructive",
      });
      return; // stop here, don't generate
    }

    // Generate digest
    const { data, error } = await supabase.functions.invoke("generate-digest");
    if (error) throw error;

    setDigest(data.digest);
    toast({
      title: "Digest generated",
      description: "Weekly insights have been created successfully.",
    });

    await loadHistory();
  } catch (error: any) {
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
      {/* Digest Generator */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Weekly Digest Generator
              </CardTitle>
              <CardDescription className="mt-2">
                AI-powered summary of top feedback for your team
              </CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <Button
                onClick={handleCluster}
                disabled={isClustering}
                variant="outline"
                className="gap-2 w-full md:w-auto"
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
                className="gap-2 w-full md:w-auto"
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

      {/* Latest Digest */}
      {digest && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Latest Digest</CardTitle>
            <CardDescription>Generated just now</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap bg-muted p-4 rounded-lg">
                <Markdown>{digest}</Markdown>
              </div>
            </div>
            <div className="mt-6 flex flex-col md:flex-row gap-2">
              <Button variant="outline" className="gap-2 w-full md:w-auto">
                <Mail className="h-4 w-4" />
                Send via Email
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Digest History */}
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
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedDigest(item)}
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
                    <Markdown>{item.content}</Markdown>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
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

      {/* Modal for Selected Digest */}
{selectedDigest && (
  <div className="fixed inset-0 z-50 bg-black/50 ">
    <div className="flex justify-center items-start sm:items-center pt-4 sm:pt-8 pb-4 px-2 min-h-screen">
      <div className="bg-background rounded-lg w-full sm:max-w-lg p-4 sm:p-6 relative shadow-lg overflow-y-auto max-h-[90vh]">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 sm:top-4 sm:right-4"
          onClick={() => setSelectedDigest(null)}
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Modal content */}
        <CardTitle className="mb-2 text-sm sm:text-base">
          Digest from{" "}
          {new Date(selectedDigest.sent_at).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </CardTitle>
        <CardContent className="text-sm sm:text-base">
          {selectedDigest.channels?.length > 0 && (
            <div className="flex gap-1 sm:gap-2 mb-4 flex-wrap">
              {selectedDigest.channels.map((channel: string) => (
                <span
                  key={channel}
                  className="text-xs sm:text-sm px-2 py-1 bg-primary/10 text-primary rounded"
                >
                  {channel}
                </span>
              ))}
            </div>
          )}
          <div className="whitespace-pre-wrap text-sm sm:text-base">
            <Markdown>{selectedDigest.content}</Markdown>
          </div>
        </CardContent>
      </div>
    </div>
  </div>
)}


    </div>
  );
};

export default DigestPreview;
