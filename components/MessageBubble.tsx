import React from 'react';
import { Message, Role } from '../types';
import { UserIcon, BotIcon } from './Icons';

interface MessageBubbleProps {
  message: Message;
}

// Simple formatter to detect code blocks (```code```) and style them differently
const FormatContent: React.FC<{ content: string }> = ({ content }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Remove the backticks and optional language identifier
          const rawCode = part.slice(3, -3);
          const firstNewLine = rawCode.indexOf('\n');
          let code = rawCode;
          let lang = '';

          if (firstNewLine !== -1) {
             const potentialLang = rawCode.substring(0, firstNewLine).trim();
             // Simple check if it looks like a language identifier (no spaces, short)
             if (potentialLang && !potentialLang.includes(' ') && potentialLang.length < 15) {
                 lang = potentialLang;
                 code = rawCode.substring(firstNewLine + 1);
             }
          }

          return (
            <div key={index} className="my-4 rounded-md overflow-hidden bg-black/30 border border-gray-700">
              {lang && (
                <div className="bg-gray-800 px-4 py-1 text-xs text-gray-400 border-b border-gray-700 font-mono">
                  {lang}
                </div>
              )}
              <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-200">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Handle inline formatting for bold (**text**)
        const textParts = part.split(/(\*\*.*?\*\*)/g);
        return (
          <span key={index}>
            {textParts.map((subPart, subIndex) => {
               if (subPart.startsWith('**') && subPart.endsWith('**')) {
                   return <strong key={subIndex} className="font-bold text-white">{subPart.slice(2, -2)}</strong>;
               }
               return <span key={subIndex} className="whitespace-pre-wrap">{subPart}</span>;
            })}
          </span>
        );
      })}
    </>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.USER;

  return (
    <div className={`group w-full text-gray-100 border-b border-black/10 dark:border-gray-900/50 ${isUser ? 'bg-gray-900' : 'bg-gray-900'}`}>
      <div className="m-auto w-full max-w-3xl p-4 flex gap-4 md:gap-6">
        <div className="flex-shrink-0 flex flex-col relative items-end">
          <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${isUser ? 'bg-blue-600' : 'bg-green-600'}`}>
             {isUser ? <UserIcon className="w-5 h-5 text-white" /> : <BotIcon className="w-5 h-5 text-white" />}
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
            {/* Display Attachments if any */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3">
                {message.attachments.map((att, i) => (
                  <div key={i} className="rounded-lg overflow-hidden border border-gray-700 max-w-sm">
                    {att.mimeType.startsWith('image/') ? (
                      <img src={att.uri || `data:${att.mimeType};base64,${att.data}`} alt="attachment" className="max-h-64 object-contain" />
                    ) : (
                      <video controls src={att.uri || `data:${att.mimeType};base64,${att.data}`} className="max-h-64" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className={`text-base leading-7 ${message.isError ? 'text-red-400' : 'text-gray-100'}`}>
               {message.role === Role.MODEL && message.text === '' && message.isStreaming ? (
                 <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse" />
               ) : (
                 <FormatContent content={message.text} />
               )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;