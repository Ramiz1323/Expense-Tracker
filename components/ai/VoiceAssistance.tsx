"use client";

import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useEffect, useState } from "react";

export default function VoiceAssistant() {
  const {
    listening,
    transcript,
    startListening,
    speak,
    setTranscript,
  } = useVoiceAssistant();

  const [loading, setLoading] = useState(false);

  // Auto-send when speech ends
  useEffect(() => {
    if (!transcript) return;

    const sendToAssistant = async () => {
      setLoading(true);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcript }),
      });

      const data = await res.json();
      speak(data.reply);

      setTranscript("");
      setLoading(false);
    };

    sendToAssistant();
  }, [transcript]);

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={startListening}
        variant={listening ? "destructive" : "secondary"}
        size="icon"
        title="Speak"
      >
        {listening ? <MicOff /> : <Mic />}
      </Button>

      {loading && (
        <span className="text-xs text-muted-foreground">
          Listening & processing...
        </span>
      )}
    </div>
  );
}
