import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chat, GenerateContentResponse } from "@google/genai";
import { Message, Role, Attachment, ChatSession } from './types';
import { createChatSession, sendMessageStream } from './services/geminiService';
import MessageBubble from './components/MessageBubble';
import ChatInput from './components/ChatInput';
import Sidebar from './components/Sidebar';
import { SparklesIcon, MenuIcon } from './components/Icons';

const App: React.FC = () => {
  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // History State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load History from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('gemini_chat_history');
    if (saved) {
      try {
        setSessions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse chat history");
      }
    }
    chatSessionRef.current = createChatSession();
  }, []);

  // Save History to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('gemini_chat_history', JSON.stringify(sessions));
  }, [sessions]);

  // Sync current messages to the active session in history
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
        setSessions(prev => prev.map(session => 
            session.id === currentSessionId 
                ? { ...session, messages: messages, title: session.title === 'New Chat' ? generateTitle(messages) : session.title } 
                : session
        ));
    }
  }, [messages, currentSessionId]);

  const generateTitle = (msgs: Message[]): string => {
      const firstUserMsg = msgs.find(m => m.role === Role.USER);
      if (firstUserMsg) {
          return firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
      }
      return 'New Chat';
  };

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text: string, attachments: Attachment[] = []) => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;

    // Ensure we have a valid chat session ID
    let activeId = currentSessionId;
    if (!activeId) {
        activeId = Date.now().toString();
        const newSession: ChatSession = {
            id: activeId,
            title: 'New Chat',
            messages: [],
            createdAt: Date.now()
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(activeId);
        // We re-initialize the Gemini chat object for a fresh context
        chatSessionRef.current = createChatSession();
    } else if (!chatSessionRef.current) {
         chatSessionRef.current = createChatSession();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: text.trim(),
      attachments: attachments
    };

    setIsLoading(true);
    setMessages(prev => [...prev, userMessage]);

    // Add placeholder for AI response
    const aiMessageId = (Date.now() + 1).toString();
    const initialAiMessage: Message = {
      id: aiMessageId,
      role: Role.MODEL,
      text: '',
      isStreaming: true
    };
    setMessages(prev => [...prev, initialAiMessage]);

    try {
      const stream = await sendMessageStream(chatSessionRef.current!, text, attachments);
      
      let fullText = '';
      
      for await (const chunk of stream) {
        const chunkText = (chunk as GenerateContentResponse).text || '';
        fullText += chunkText;
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, text: fullText } 
              : msg
          )
        );
      }
      
      // Finalize message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === aiMessageId 
              ? { ...msg, isStreaming: false } 
              : msg
        )
      );

    } catch (error) {
      console.error("Error generating response:", error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, isStreaming: false, isError: true, text: "Sorry, something went wrong. Please try again." } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setCurrentSessionId(null);
    chatSessionRef.current = createChatSession();
    setIsLoading(false);
  }, []);

  const handleSelectSession = (id: string) => {
      const session = sessions.find(s => s.id === id);
      if (session) {
          setMessages(session.messages);
          setCurrentSessionId(id);
          // Create a new chat instance, and strictly speaking, we should replay history to it if we want context.
          // For now, let's create a fresh instance. If you want context, you'd need to rebuild history via Gemini API (sendMessage history prop).
          // However, the standard `ai.chats.create` starts fresh. Context restoration requires manually adding history to `history` param.
          // Simplified for this demo: Previous context is visual only, new messages start fresh context or we assume persistent object if not disposed.
          
          // Re-initializing with history context
          const historyForGemini = session.messages
            .filter(m => !m.isError)
            .map(m => ({
                role: m.role,
                parts: m.attachments && m.attachments.length > 0 
                    ? [...m.attachments.map(a => ({ inlineData: { mimeType: a.mimeType, data: a.data } })), { text: m.text }] 
                    : [{ text: m.text }]
            }));
            
          chatSessionRef.current = createChatSession();
          // We can't easily inject history into an existing object in this SDK version without creating with history.
          // Note: Full context restoration is a more advanced feature, here we just load the UI history.
      }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
          handleNewChat();
      }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative w-full">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white"
                >
                    <MenuIcon className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleNewChat}>
                    <div className="p-1.5 rounded-lg bg-gray-800 text-gray-200">
                        <SparklesIcon className="w-5 h-5 text-blue-400" />
                    </div>
                    <h1 className="text-lg font-semibold tracking-tight">Gemini GPT</h1>
                </div>
            </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-900/10">
                <SparklesIcon className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">How can I help you today?</h2>
                <p className="text-gray-400 max-w-md">
                I can help you write code, brainstorm ideas, draft emails, or answer your questions using the latest Gemini models.
                </p>
                
                {/* Quick Prompts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 max-w-2xl w-full">
                {[
                    "Explain quantum computing in simple terms",
                    "Write a React component for a navbar",
                    "Give me ideas for a 5-year-old's birthday",
                    "Debug a Python script for web scraping"
                ].map((prompt, i) => (
                    <button 
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="p-4 text-sm text-left bg-gray-800 border border-gray-700 hover:bg-gray-750 rounded-xl transition-colors"
                    >
                    {prompt}
                    </button>
                ))}
                </div>
            </div>
            ) : (
            <div className="flex flex-col pb-4">
                {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} className="h-4" />
            </div>
            )}
        </main>

        {/* Input Area */}
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default App;