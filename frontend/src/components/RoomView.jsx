import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Users, Lock } from 'lucide-react';
import { scrimsAPI } from '../services/api';
import toast from 'react-hot-toast';

const RoomView = ({ scrimId, isOwner }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, [scrimId]);

  const fetchMessages = async () => {
    try {
      const response = await scrimsAPI.getRoomMessages(scrimId);
      setMessages(response.data.room.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await scrimsAPI.sendRoomMessage(scrimId, {
        content: newMessage,
        type: 'text'
      });
      setNewMessage('');
      fetchMessages();
      toast.success('Message sent');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <MessageSquare className="h-5 w-5 mr-2" />
        Scrim Room
        <Lock className="h-4 w-4 ml-2 text-gray-400" />
      </h3>

      {/* Messages */}
      <div className="bg-gray-700 rounded-lg p-4 h-64 overflow-y-auto mb-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gaming-purple"></div>
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div key={index} className={`p-3 rounded-lg ${
                message.type === 'credentials' 
                  ? 'bg-gaming-purple/20 border border-gaming-purple/30' 
                  : message.type === 'system'
                  ? 'bg-blue-900/20 border border-blue-500/30'
                  : 'bg-gray-600'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{message.senderId?.name}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.type === 'credentials' && (
                  <span className="text-xs text-gaming-purple">🔐 Room Credentials</span>
                )}
                {message.type === 'system' && (
                  <span className="text-xs text-blue-400">📢 System Message</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages yet</p>
              {!isOwner && (
                <p className="text-xs mt-1">Only organizers can send messages</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Send Message (Only for org owners) */}
      {isOwner && (
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Send a message to participants..."
            className="input flex-1"
          />
          <button type="submit" className="btn-primary">
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
};

export default RoomView;