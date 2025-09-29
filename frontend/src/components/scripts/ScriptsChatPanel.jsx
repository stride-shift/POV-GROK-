import React, { useRef, useEffect } from 'react';
import Button from '../ui/Button';
import { Send, MessageSquare, User, Bot } from 'lucide-react';

const ScriptsChatPanel = ({ 
  messages, 
  input, 
  onInputChange, 
  onSubmit, 
  disabled, 
  viewingHistoricalVersion = false 
}) => {
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
    'Make it more conversational',
    'Add objection responses',
    'Include discovery questions',
    'Make it shorter',
    'Add more confidence',
    'Include value statements'
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
            ? 'Generate a sales script first' 
            : 'Chat to edit and improve your sales script'}
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">No messages yet. Try one of these:</p>
            <div className="space-y-2">
              {quickActions.slice(0, 3).map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => !disabled && onSubmit(action)}
                  className="w-full text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={disabled}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.type === 'ai' && (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-blue-600" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.isThinking ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-pulse">Processing...</div>
                    </div>
                  ) : (
                    <div className="text-sm">{message.content}</div>
                  )}
                  <div 
                    className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                {message.type === 'user' && (
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {!disabled && messages.length > 0 && (
        <div className="p-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Quick actions:</div>
          <div className="flex flex-wrap gap-2">
            {quickActions.slice(3).map((action, idx) => (
              <button
                key={idx}
                onClick={() => onSubmit(action)}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={disabled ? "Editing disabled" : "Type your request..."}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-500"
            rows={1}
            disabled={disabled}
          />
          <Button
            type="submit"
            icon={Send}
            disabled={disabled || !input.trim()}
            size="sm"
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ScriptsChatPanel;
