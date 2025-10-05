import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, MessageSquare, Sparkles, Bot, LogOut } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import FeedbackUpload from "@/components/feedback/FeedbackUpload";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import DigestPreview from "@/components/digest/DigestPreview";
import FeedbackChat from "@/components/chat/FeedbackChat";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [activeTab, setActiveTab] = useState("analytics");
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out successfully" });
    navigate("/auth");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative">
        <DashboardHeader />
       <Button
  onClick={handleSignOut}
  variant="outline"
  className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-1 rounded-md shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors"
>
  <LogOut className="h-5 w-5" />
  Sign Out
</Button>


      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-4 mb-8">
            <TabsTrigger value="analytics" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <Bot className="h-4 w-4" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="digest" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Digest
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <Card className="p-6 bg-gradient-card">
              <FeedbackUpload />
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="space-y-6">
            <FeedbackChat />
          </TabsContent>

          <TabsContent value="digest" className="space-y-6">
            <DigestPreview />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
