import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Users, Lock, Image, X, Upload } from 'lucide-react';
import { scrimsAPI, uploadAPI } from '../services/api';
import toast from 'react-hot-toast';

const RoomView = ({ scrimId, isOwner }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
  }, [scrimId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const response = await scrimsAPI.getRoomMessages(scrimId);
      setMessages(response.data.room.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to load messages');
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
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      console.log('📤 Uploading image to room chat:', file.name);
      
      const response = await uploadAPI.uploadImage(file);
      
      // Send image message
      await scrimsAPI.sendRoomMessage(scrimId, {
        content: `Image: ${file.name}`,
        type: 'image',
        imageUrl: response.data.imageUrl
      });
      
      fetchMessages();
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('❌ Failed to upload image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{message.senderId?.name}</span>
                    {message.senderId?.role && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        message.senderId.role === 'organization' ? 'bg-blue-500/20 text-blue-400' :
                        message.senderId.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {message.senderId.role}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="mt-1">
                  {message.type === 'image' && message.imageUrl ? (
                    <div>
                      <p className="text-sm text-gray-300 mb-2">{message.content}</p>
                      <img 
                        src={message.imageUrl} 
                        alt="Shared image"
                        className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(message.imageUrl, '_blank')}
                      />
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                
                {message.type === 'credentials' && (
                  <span className="text-xs text-gaming-purple">🔐 Room Credentials</span>
                )}
                {message.type === 'system' && (
                  <span className="text-xs text-blue-400">📢 System Message</span>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
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
        <div className="space-y-3">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Send a message to participants..."
              className="input flex-1"
            />
            
            {/* Image Upload Button */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className={`btn-secondary ${uploadingImage ? 'opacity-50' : ''}`}
              title="Upload Image"
            >
              {uploadingImage ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </button>
            
            <button type="submit" className="btn-primary" disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </button>
          </form>
          
          {uploadingImage && (
            <p className="text-sm text-gaming-cyan">Uploading image...</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomView;