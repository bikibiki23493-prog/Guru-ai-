import React from 'react';
import { ChatSession } from '../types';
import { PlusIcon, MessageSquareIcon, TrashIcon, XMarkIcon } from './Icons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <aside 
        className={`fixed md:relative top-0 left-0 h-full bg-black md:bg-gray-950 w-64 border-r border-gray-800 z-30 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col`}
      >
        <div className="p-3">
            {/* Header / New Chat */}
            <button 
                onClick={() => {
                    onNewChat();
                    if (window.innerWidth < 768) onClose();
                }}
                className="flex items-center gap-3 w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-sm text-white transition-colors mb-4"
            >
                <PlusIcon className="w-5 h-5" />
                <span>New Chat</span>
            </button>
            
            <div className="text-xs font-semibold text-gray-500 mb-2 px-2">History</div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin">
            {sessions.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-10 p-4">
                    <div className="opacity-50 mb-2 flex justify-center"><MessageSquareIcon className="w-8 h-8"/></div>
                    No chat history yet
                </div>
            ) : (
                <div className="space-y-1">
                    {sessions.sort((a, b) => b.createdAt - a.createdAt).map(session => (
                        <div 
                            key={session.id}
                            onClick={() => {
                                onSelectSession(session.id);
                                if (window.innerWidth < 768) onClose();
                            }}
                            className={`group flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors text-sm ${
                                currentSessionId === session.id 
                                    ? 'bg-gray-800 text-white' 
                                    : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                            }`}
                        >
                            <MessageSquareIcon className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 truncate relative">{session.title || 'New Chat'}</span>
                            
                            {/* Delete Button (visible on group hover or active) */}
                            <button
                                onClick={(e) => onDeleteSession(session.id, e)}
                                className={`p-1 hover:text-red-400 hover:bg-gray-700 rounded transition-opacity ${
                                    currentSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                                title="Delete chat"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Mobile Close Button */}
        <button 
            onClick={onClose}
            className="md:hidden absolute top-3 right-3 p-2 text-gray-400 hover:text-white"
        >
            <XMarkIcon className="w-6 h-6" />
        </button>
      </aside>
    </>
  );
};

export default Sidebar;