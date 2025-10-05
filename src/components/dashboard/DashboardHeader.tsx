import { Bot } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DashboardHeader = () => {
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get user email or profile name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();
        
        setUserName(profile?.full_name || 'User');
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroBg} 
          alt="AI feedback analysis background" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-hero" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center p-3 mb-6 rounded-2xl bg-white backdrop-blur-sm">
          <Bot className="h-8 w-8 text-primary " />
        </div>
        
        {userName && (
          <p className="text-lg text-white mb-2">
            Welcome, <span className="font-semibold text-white">{userName}!</span>
          </p>
        )}
        
        <h1 className="text-5xl font-bold mb-4 text-white">
          Feedback Prioritizer
        </h1>
        
        <p className="text-xl text-white max-w-2xl mx-auto mb-8">
          AI-powered feedback analysis with Groq. Classify sentiment, urgency, and impact automatically.
        </p>

        <div className="flex flex-wrap justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success" />
            <span className="text-white">Real-time Classification</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-white">Smart Clustering</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-warning" />
            <span className="text-white">Automated Digests</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
