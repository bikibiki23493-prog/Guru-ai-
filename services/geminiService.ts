import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Attachment } from "../types";

// Initialize the client once.
// Ensure your environment supports process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

export const createChatSession = (): Chat => {
  return ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: "You are a helpful, intelligent, and precise AI assistant. You answer questions clearly and accurately. You can write code, explain concepts, and help with creative writing.",
    },
  });
};

export const sendMessageStream = async (
  chat: Chat, 
  message: string,
  attachments: Attachment[] = []
): Promise<AsyncIterable<GenerateContentResponse>> => {
  
  // If there are attachments, we need to construct a multipart message
  if (attachments.length > 0) {
    const parts = [
      ...attachments.map(att => ({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data
        }
      })),
      { text: message }
    ];
    
    // Pass the parts array as the message
    return await chat.sendMessageStream({ message: parts });
  }

  // Text-only message
  return await chat.sendMessageStream({ message });
};