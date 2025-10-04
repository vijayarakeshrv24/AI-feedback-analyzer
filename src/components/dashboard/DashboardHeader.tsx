import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const DashboardHeader = ({ userName  }) => {
  const [displayedName, setDisplayedName] = useState("");

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedName(userName.slice(0, index + 1));
      index++;
      if (index === userName.length) clearInterval(interval);
    }, 150); // change 150ms to control speed
    return () => clearInterval(interval);
  }, [userName]);

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
          <Bot className="h-8 w-8 text-primary" />
        </div>

        <h1 className="text-5xl text-white font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
          Welcome{" "}
          <span className="text-5xl text-white font-bold">
            {displayedName}
          </span>
          {displayedName.length < userName.length && <span className="text-5xl text-blue-400 font-bold animate-blink"></span>}
        </h1>

        <h1 className="text-5xl text-white font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
          Feedback Prioritizer
        </h1>

        <p className="text-xl text-white max-w-2xl mx-auto mb-8">
          AI-powered feedback analysis with Groq. Classify sentiment, urgency, and impact automatically.
        </p>
      </div>

      {/* Blinking cursor animation */}
      <style jsx>{`
        @keyframes blink {
          0%, 50%, 100% { opacity: 1; }
          25%, 75% { opacity: 0; }
        }
        .animate-blink {
          display: inline-block;
          animation: blink 1s step-start infinite;
        }
      `}</style>
    </div>
  );
};

export default DashboardHeader;
