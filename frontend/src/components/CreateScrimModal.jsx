import React, { useState } from 'react';
import { X, Calendar, Users, DollarSign } from 'lucide-react';
import { scrimsAPI } from '../services/api';
import toast from 'react-hot-toast';

const CreateScrimModal = ({ isOpen, onClose, onScrimCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    game: '',
    platform: 'PC',
    date: '',
    timeSlot: {
      start: '',
      end: ''
    },
    capacity: 10,
    entryFee: 0,
    prizePool: '',
    room: {
      id: '',
      password: ''
    }
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Combine date and time slots
      const scrimDate = new Date(formData.date);
      const [startHour, startMin] = formData.timeSlot.start.split(':');
      const [endHour, endMin] = formData.timeSlot.end.split(':');

      const startTime = new Date(scrimDate);
      startTime.setHours(parseInt(startHour), parseInt(startMin));

      const endTime = new Date(scrimDate);
      endTime.setHours(parseInt(endHour), parseInt(endMin));

      const scrimData = {
        ...formData,
        date: scrimDate.toISOString(),
        timeSlot: {
          start: startTime.toISOString(),
          end: endTime.toISOString()
        },
        capacity: parseInt(formData.capacity),
        entryFee: parseFloat(formData.entryFee) || 0,
        prizePool: formData.prizePool
      };

      await scrimsAPI.create(scrimData);
      toast.success('Scrim created successfully!');
      onScrimCreated();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        game: '',
        platform: 'PC',
        date: '',
        timeSlot: { start: '', end: '' },
        capacity: 10,
        isPaid: false,
        price: 0,
        room: { id: '', password: '' }
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create scrim');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Create New Scrim</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  className="input w-full"
                  placeholder="Epic Valorant Scrim"
                  value={formData.title}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Game *
                </label>
                <input
                  type="text"
                  name="game"
                  required
                  className="input w-full"
                  placeholder="Valorant, CS2, etc."
                  value={formData.game}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                className="input w-full resize-none"
                placeholder="Describe your scrim..."
                min={new Date().toISOString().split('T')[0]}
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            {/* Date & Time */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  className="input w-full"
                  value={formData.date}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  name="timeSlot.start"
                  required
                  className="input w-full"
                  value={formData.timeSlot.start}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  name="timeSlot.end"
                  required
                  className="input w-full"
                  value={formData.timeSlot.end}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Platform & Capacity */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Platform
                </label>
                <select
                  name="platform"
                  className="input w-full"
                  value={formData.platform}
                  onChange={handleChange}
                >
                  <option value="PC">PC</option>
                  <option value="PlayStation">PlayStation</option>
                  <option value="Xbox">Xbox</option>
                  <option value="Mobile">Mobile</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Users className="inline h-4 w-4 mr-1" />
                  Capacity *
                </label>
                <input
                  type="number"
                  name="capacity"
                  min="2"
                  max="100"
                  required
                  className="input w-full"
                  value={formData.capacity}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Room Credentials */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Room ID
                </label>
                <input
                  type="text"
                  name="room.id"
                  className="input w-full"
                  placeholder="Discord/Game room ID"
                  value={formData.room.id}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Room Password
                </label>
                <input
                  type="text"
                  name="room.password"
                  className="input w-full"
                  placeholder="Room password"
                  value={formData.room.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Pricing */}
            <div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <DollarSign className="inline h-4 w-4 mr-1" />
                    Entry Fee (₹)
                  </label>
                  <input
                    type="number"
                    name="entryFee"
                    min="0"
                    step="0.01"
                    className="input w-full"
                    placeholder="0 (Free if 0)"
                    value={formData.entryFee}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Prize Pool
                  </label>
                  <input
                    type="text"
                    name="prizePool"
                    className="input w-full"
                    placeholder="e.g., $500 + Trophies"
                    value={formData.prizePool}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Scrim'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateScrimModal;