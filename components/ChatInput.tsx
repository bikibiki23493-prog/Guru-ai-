import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, StopIcon, PaperClipIcon, XMarkIcon, MicrophoneIcon } from './Icons';
import { Attachment } from '../types';

interface ChatInputProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isListening, setIsListening] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const textRef = useRef(text); // To access latest text in speech closure

  // Keep textRef synced
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!text.trim() && attachments.length === 0) || isLoading) return;
    
    // Stop listening if sending
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    onSend(text, attachments);
    setText('');
    setAttachments([]);
    
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newAttachments: Attachment[] = [];
      
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        
        // Convert to base64
        try {
          const base64String = await readFileAsBase64(file);
          // Format for Gemini API (remove data URL prefix)
          const base64Data = base64String.split(',')[1];
          
          newAttachments.push({
            mimeType: file.type,
            data: base64Data,
            uri: base64String // Keep full string for local preview
          });
        } catch (error) {
          console.error("Error reading file:", error);
        }
      }
      
      setAttachments(prev => [...prev, ...newAttachments]);
      // Reset input value so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    const startText = textRef.current;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      // Determine separator: add space if there is text and it doesn't end in space
      const separator = startText && !startText.endsWith(' ') ? ' ' : '';
      setText(`${startText}${separator}${finalTranscript}${interimTranscript}`);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="w-full bg-gray-900 border-t border-gray-800 pt-2 pb-6 px-4">
      <div className="max-w-3xl mx-auto">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          accept="image/*,video/*"
          onChange={handleFileSelect} 
        />
        
        <div className="relative flex flex-col w-full bg-gray-800 rounded-xl border border-gray-700 focus-within:border-gray-500 transition-colors shadow-lg">
          {/* Attachment Preview Area */}
          {attachments.length > 0 && (
            <div className="flex gap-2 p-3 pb-0 overflow-x-auto">
              {attachments.map((att, index) => (
                <div key={index} className="relative group flex-shrink-0">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-600 bg-gray-900">
                    {att.mimeType.startsWith('image/') ? (
                      <img src={att.uri} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <video src={att.uri} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <button 
                    onClick={() => removeAttachment(index)}
                    className="absolute -top-1.5 -right-1.5 bg-gray-700 text-white rounded-full p-0.5 hover:bg-gray-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end w-full p-3 gap-2">
            <button
              onClick={triggerFileInput}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-200 rounded-md hover:bg-gray-700/50 transition-colors pb-3"
              title="Attach files"
            >
              <PaperClipIcon className="w-5 h-5" />
            </button>
            
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Gemini..."
              className="w-full max-h-[200px] bg-transparent border-0 resize-none focus:ring-0 focus:outline-none text-gray-100 placeholder-gray-400 py-2"
              disabled={isLoading}
            />

            <button
              onClick={toggleListening}
              disabled={isLoading}
              className={`p-2 rounded-md transition-colors pb-3 ${
                isListening 
                  ? 'text-red-500 animate-pulse' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
              title="Voice Input"
            >
              <MicrophoneIcon className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => handleSubmit()}
              disabled={(!text.trim() && attachments.length === 0) || isLoading}
              className={`p-1.5 rounded-md transition-all duration-200 mb-1 ${
                (text.trim() || attachments.length > 0) && !isLoading 
                  ? 'bg-blue-600 text-white hover:bg-blue-500' 
                  : 'bg-transparent text-gray-500 cursor-not-allowed'
              }`}
            >
               {isLoading ? <StopIcon className="w-4 h-4 animate-pulse" /> : <SendIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="text-center mt-2">
            <p className="text-xs text-gray-500">Gemini can make mistakes. Consider checking important information.</p>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;