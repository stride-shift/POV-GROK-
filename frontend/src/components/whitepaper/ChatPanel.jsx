import React, { useRef, useEffect } from 'react';
import Button from '../ui/Button';
import { Send, MessageSquare, User, Bot } from 'lucide-react';

const ChatPanel = ({ messages, input, onInputChange, onSubmit, disabled, viewingHistoricalVersion = false }) => {
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSubmit(input.trim());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const quickActions = [
    'Make the intro more compelling',
    'Add a case study',
    'Simplify the language',
    'Include ROI calculations',
    'Make it shorter',
    'Add more evidence'
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Edit with AI</h3>
        </div>
        <p className="text-xs text-gray-600">
          {viewingHistoricalVersion 
            ? '⚠️ Viewing historical version - return to current version to edit' 
            : disabled 
            ? 'Generate a whitepaper first' 
            : 'Chat to edit and improve your whitepaper'}
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-4">
              {disabled ? 'Create a whitepaper to start editing' : 'Try these quick edits:'}
            </div>
            {!disabled && (
              <div className="space-y-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => onSubmit(action)}
                    className="w-full text-left p-2 text-xs bg-gray-50 hover:bg-gray-100 rounded border transition"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'ai' && (
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-blue-600" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.isThinking ? (
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-gray-500">Thinking...</span>
                    </div>
                  ) : (
                    message.content
                  )}
                  
                  <div className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                {message.type === 'user' && (
                  <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={disabled ? "Generate a whitepaper first..." : "Ask me to edit the whitepaper..."}
              disabled={disabled}
              rows={2}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-500"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || disabled}
              className="absolute right-2 bottom-2 p-1 min-w-0"
              icon={Send}
            />
          </div>
          <div className="text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
