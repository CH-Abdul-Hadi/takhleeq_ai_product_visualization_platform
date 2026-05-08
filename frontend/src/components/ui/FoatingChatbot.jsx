import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, X, Send, Minus, 
  MoreHorizontal, Plus, Mic, ThumbsUp, Heart, MessageSquare, ArrowDown 
} from 'lucide-react';
import { aiChatbotService } from '../../services/aiChatbotService';

const FloatingChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! How can I help you today?", sender: 'bot', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollArrow, setShowScrollArrow] = useState(false);
  
  const scrollRef = useRef(null);
  const sessionIdRef = useRef(Date.now().toString());

  const quickReplies = ["Track my order", "Refund status", "Talk to agent", "FAQs"];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isTyping]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowScrollArrow(scrollHeight - scrollTop > clientHeight + 20);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async (e, customText = null) => {
    if (e) e.preventDefault();
    const textToSend = customText || input;
    if (!textToSend.trim()) return;

    const userMsg = { 
      id: Date.now(), 
      text: textToSend, 
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await aiChatbotService.sendMessage(textToSend, sessionIdRef.current);
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: response.reply || response.message || "I didn't quite understand that.", 
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: "Sorry, I am having trouble connecting to the server.", 
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatMessage = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const WhatsAppTypingLoader = () => (
    <div className="bg-borderColor p-3 px-4 rounded-2xl rounded-tl-sm flex items-center gap-2 h-10 shadow-sm">
      <span className="w-2 h-2 bg-textColorMuted rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
      <span className="w-2 h-2 bg-textColorMuted rounded-full animate-[pulse_1s_ease-in-out_infinite] [animation-delay:0.2s]" />
      <span className="w-2 h-2 bg-textColorMuted rounded-full animate-[pulse_1s_ease-in-out_infinite] [animation-delay:0.4s]" />
    </div>
  );

  return (
    <div className="fixed bottom-marginLarge right-marginLarge z-50 z-zIndexModal font-fontFamilyBody">
      {/* Chat Window */}
      {isOpen && (
        <div className="flex flex-col mb-marginMedium w-80 sm:w-96 h-[550px] bg-surfaceColor border border-borderColor rounded-3xl shadow-boxShadowHigh overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 relative">
          
          {/* Header */}
          <div className="bg-secondaryColor p-paddingMedium border-b border-borderColor flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#EBB924] flex items-center justify-center text-black font-bold text-lg">
                T
              </div>
              <div className="flex flex-col">
                <h4 className="text-text-fontSizeMd font-fontWeightBold text-primaryColor tracking-letterSpacing uppercase leading-none mb-1">
                  Takleeq AI
                </h4>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-successColor animate-pulse" />
                  <span className="text-xs text-textColorMuted">online · responds instantly</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-borderColor/50 flex items-center justify-center text-textColorMuted hover:text-primaryColor hover:bg-borderColor transition-colors"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-paddingMedium space-y-4 scrollbar-thin relative bg-surfaceColor/50 pb-20"
          >
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col">
                <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start items-start gap-2'}`}>
                  {msg.sender === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-[#EBB924] shrink-0 flex items-center justify-center text-black font-bold text-sm mt-1">
                      T
                    </div>
                  )}
                  
                  <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div 
                      className={`max-w-[240px] sm:max-w-[280px] p-3 px-4 text-sm shadow-sm whitespace-pre-wrap ${
                        msg.sender === 'user' 
                          ? 'bg-primaryColor text-textColorInverse font-medium rounded-2xl rounded-br-sm' 
                          : 'bg-borderColor text-textColorMain rounded-2xl rounded-tl-sm'
                      }`}
                    >
                      {formatMessage(msg.text)}
                    </div>
                    
                    {/* Bot Reactions */}
                    {msg.sender === 'bot' && (
                      <div className="flex items-center gap-2 mt-2 ml-1">
                        <button className="flex items-center gap-1 px-2 py-1 bg-secondaryColor border border-borderColor rounded-full text-xs text-textColorMuted hover:text-primaryColor transition-colors">
                          <ThumbsUp size={12} /> <span>0</span>
                        </button>
                        <button className="flex items-center gap-1 px-2 py-1 bg-secondaryColor border border-borderColor rounded-full text-xs text-textColorMuted hover:text-dangerColor transition-colors">
                          <Heart size={12} /> <span>0</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {/* Timestamp */}
                <div className={`text-[10px] text-textColorMuted mt-1 ${msg.sender === 'user' ? 'text-right' : 'text-right pr-4'}`}>
                  {msg.timestamp}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start items-start gap-2 animate-in fade-in">
                <div className="w-8 h-8 rounded-full bg-[#EBB924] shrink-0 flex items-center justify-center text-black font-bold text-sm mt-1">
                  T
                </div>
                <WhatsAppTypingLoader />
              </div>
            )}
          </div>

          {/* Scroll Down Arrow Overlay */}
          {showScrollArrow && (
            <button 
              onClick={scrollToBottom}
              className="absolute bottom-32 right-1/2 translate-x-1/2 w-8 h-8 bg-surfaceColor border border-borderColor rounded-full shadow-boxShadowMedium flex items-center justify-center text-textColorMuted hover:text-primaryColor z-10 animate-in fade-in zoom-in"
            >
              <ArrowDown size={16} />
            </button>
          )}

          {/* Bottom Area (Quick Replies + Input + Footer) */}
          <div className="bg-secondaryColor border-t border-borderColor flex flex-col z-20">
            
            {/* Quick Replies Scrollable Area */}
            <div className="flex overflow-x-auto gap-2 p-3 scrollbar-none items-center">
              {quickReplies.map((qr, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(null, qr)}
                  className="whitespace-nowrap px-3 py-1.5 border border-borderColor rounded-full text-xs font-medium text-textColorMain bg-surfaceColor hover:border-primaryColor hover:text-primaryColor transition-all"
                >
                  {qr}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <form 
              onSubmit={handleSend}
              className="px-3 pb-2 flex items-center gap-2"
            >
              <button 
                type="button"
                className="w-10 h-10 shrink-0 bg-surfaceColor border border-borderColor rounded-lg flex items-center justify-center text-textColorMuted hover:text-primaryColor hover:border-primaryColor transition-all"
              >
                <Plus size={20} />
              </button>
              
              <div className="flex-1 relative flex items-center bg-surfaceColor border border-borderColor rounded-full px-4 overflow-hidden focus-within:ring-1 focus-within:ring-primaryColor focus-within:border-primaryColor transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-transparent py-2.5 text-sm text-textColorMain focus:outline-none pr-8"
                />
                <button type="button" className="text-textColorMuted hover:text-primaryColor absolute right-3">
                  <Mic size={18} />
                </button>
              </div>

              <button 
                type="submit"
                disabled={!input.trim()}
                className="w-10 h-10 shrink-0 bg-primaryColor text-textColorInverse rounded-lg flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send size={18} className="ml-1" />
              </button>
            </form>

            {/* Footer Text */}
            <div className="py-2 text-center">
              <span className="text-[10px] text-textColorMuted">
                Powered by Takleeq — End-to-end encrypted
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Toggle Button */}
      <div className="flex justify-end mt-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-primaryColor text-textColorInverse p-paddingMedium rounded-full shadow-boxShadowMedium hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        >
          {isOpen ? <Minus size={28} /> : <MessageCircle size={28} />}
        </button>
      </div>
    </div>
  );
};

export default FloatingChatbot;