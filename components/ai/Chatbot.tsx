"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MessageCircle, Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Mic, MicOff } from "lucide-react";
import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your FinTrack assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const { listening, transcript, setTranscript, startListening, speak } = useVoiceAssistant();
  // const [isPaused, setIsPaused] = useState(false);
  const [mode, setmode] = useState<"chat" | "voice">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if(!transcript.trim()) return;

    handleSend(transcript, true);
    setTranscript("");
  }, [transcript]);

  const handleEditedSend = async () => {
  if (!editedText.trim() || !editingMessageId) return;

  setIsTyping(true);

  // 1️⃣ Update messages: keep everything BEFORE edited message
  setMessages(prev => {
    const index = prev.findIndex(m => m.id === editingMessageId);
    return [
      ...prev.slice(0, index),
      {
        id: editingMessageId,
        text: editedText,
        sender: "user",
        timestamp: new Date(),
      }
    ];
  });

  try {
    // 2️⃣ Call API again with edited text
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: editedText }),
    });

    const data = await response.json();

    // 3️⃣ Append new bot response
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        text: data.reply || "Sorry, I couldn't process that.",
        sender: "bot",
        timestamp: new Date(),
      },
    ]);
  } catch {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        text: "Something went wrong. Please try again.",
        sender: "bot",
        timestamp: new Date(),
      },
    ]);
  } finally {
    setIsTyping(false);
    setEditingMessageId(null);
    setEditedText("");
  }
};

  const getSpeechText = (fullText: string) => {
  const MAX_SENTENCES = 2;

    // Normalize text and split into sentences
    const sentences = fullText
      .replace(/\n+/g, " ")
      .split(". ")
      .map(s => s.trim())
      .filter(Boolean);

    // If short response, read it fully (NO default message)
    if (sentences.length <= MAX_SENTENCES) {
     return sentences.join(". ");
    }

    // Long response → summarize + default message
    const spokenPart = sentences.slice(0, MAX_SENTENCES).join(". ");
    return `${spokenPart}. Please check the chat for full details.`;
  };

  const handleSend = async (overrideText?: string, fromVoice = false) => {
    const messageText = overrideText ?? input.trim();
    if (!messageText) return;
    abortRef.current = false;

    const userMessage: Message = {
      id: editingMessageId ?? Date.now().toString(),
      text: messageText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => {
      if (editingMessageId) {
        const index = prev.findIndex((msg) => msg.id === editingMessageId);
        return[...prev.slice(0, index), userMessage];
      }
      return [...prev, userMessage];
    });
    
    scrollToBottom();
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage.text }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from server.");
      }

      const data = await response.json();
      if (abortRef.current) return;

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply || "Sorry, I couldn't process that. Please try again.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      if(fromVoice){
        const speechText = getSpeechText(botMessage.text);
        speak(speechText);
      }
      scrollToBottom();
    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, something went wrong. Please try again later.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };
  const renderFormattedText = (text: string) => {
    const renderInlineBold = (line: string) => {
      const parts = line.split("**");
      return parts.map((part, i) => 
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
      );
    };
    return text.split("\n").map((line, index) => {
      if (!line.trim()){
        return <div key={index} className="h-2"/>;
        }

        // Headings #, ##, ###
        if (line.startsWith("#")){
          const level = line.match(/^#+/)?.[0].length || 1;
          const content = line.replace(/^#+\s*/,"");
          
          return(
            <h3
              key = {index}
              className={cn(
                "font-semibold mt-3",
                level === 1 && "text-base",
                level === 2 && "text-sm",
                level >= 3 && "text-xs",
              )}
            >
              {renderInlineBold(content)}
            </h3>
          );
        }

        // Numbered list (1. 2. 3.)
        if (/^\d+\.\s/.test(line)) {
          return (
            <p key={index} className="ml-4">
              {renderInlineBold(line)}
            </p>
          );
        }
        // Bullet list (- item)
        if (line.startsWith("- ")) {
          return (
           <li key={index} className="ml-4 list-disc">
              {renderInlineBold(line.replace("- ",""))}
          </li>
          );
        }
        // Normal text
        return (
          <div key={index} className="mt-1">
            {renderInlineBold(line)}
          </div>
        );
      });
    };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white hover:scale-110 transition-transform"
              aria-label="Open chatbot"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
            <SheetHeader className="p-4 border-b border-slate-200 dark:border-slate-800">
              <SheetTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  FinTrack Assistant
                </div>
              </SheetTitle>
            </SheetHeader>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.sender === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.sender === "bot" && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2",
                      message.sender === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    )}
                  >
                    {editingMessageId === message.id ? (
                        <div className="flex gap-2">
                            <Input
                                value={editedText}
                                onChange={(e) => setEditedText(e.target.value)}
                                className="flex-1"
                                autoFocus
                            />
                            <Button size="sm" onClick={handleEditedSend}>
                                Send
                            </Button>
                        </div>
                    ) : (
                        <div className="text-sm whitespace-pre-wrap">{renderFormattedText(message.text)}</div>     
                    )}
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {message.sender === "user" && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Container */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex gap-2 items-center">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="flex-1"
                />
                {/*MIC Button */}
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={startListening}
                    aria-label="voice Input"
                >
                    {listening ? <MicOff className="h-4 w-4" /> :(<Mic className="h-4 w-4" />
                    )}
                </Button>
                <Button
                  size="icon"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={()=>{
                    if (isTyping){
                        abortRef.current = true;
                        setIsTyping(false);

                        //Enable edit mode
                        const lastUserMessage = [...messages]
                        .reverse()
                        .find(m => m.sender === "user");
                        if(lastUserMessage){
                            setEditingMessageId(lastUserMessage.id);
                            setEditedText(lastUserMessage.text);
                        }
                    }else{
                        handleSend();
                    }
                  }}
                >
                    {isTyping ? "⏹" : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                Ask me about expenses, income, budgets, or investments!
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}