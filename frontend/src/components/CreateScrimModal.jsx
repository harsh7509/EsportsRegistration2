import React, { useMemo, useState } from 'react';
import { X, Calendar, Users, DollarSign, Gamepad2, Hash } from 'lucide-react';
import { scrimsAPI } from '../services/api';
import toast from 'react-hot-toast';

const INR = (n) => (isNaN(n) ? '0' : Number(n).toString());

const CreateScrimModal = ({ isOpen, onClose, onScrimCreated }) => {
  // 1) Hooks: ALWAYS call unconditionally, top-to-bottom, same order every render
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    game: '',
    platform: 'Mobile',
    date: '',
    timeSlot: { start: '', end: '' },
    capacity: 10,
    entryFee: 0,
    prizePool: '',
    room: { id: '', password: '' },
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: type === 'checkbox' ? checked : value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  }, []);

  const validate = useMemo(() => {
    const e = {};
    if (!formData.title.trim()) e.title = 'Title is required';
    if (!formData.game.trim()) e.game = 'Game is required';
    if (!formData.date) e.date = 'Pick a date';
    if (!formData.timeSlot.start) e.start = 'Start time is required';
    if (!formData.timeSlot.end) e.end = 'End time is required';
    if (Number(formData.capacity) < 2) e.capacity = 'Minimum capacity is 2';

    if (formData.timeSlot.start && formData.timeSlot.end && formData.date) {
      const [sh, sm] = formData.timeSlot.start.split(':').map((x) => parseInt(x, 10));
      const [eh, em] = formData.timeSlot.end.split(':').map((x) => parseInt(x, 10));
      const d = new Date(formData.date);
      const s = new Date(d); s.setHours(sh || 0, sm || 0, 0, 0);
      const eEnd = new Date(d); eEnd.setHours(eh || 0, em || 0, 0, 0);
      if (!(eEnd > s)) e.end = 'End time must be after start time';
    }

    if (formData.entryFee !== '' && Number(formData.entryFee) < 0) e.entryFee = 'Cannot be negative';
    if (formData.prizePool !== '' && Number(formData.prizePool) < 0) e.prizePool = 'Cannot be negative';

    return e;
  }, [formData]);

  // 2) Conditional return AFTER all hooks
  if (!isOpen) return null;

  const submit = async (e) => {
    e.preventDefault();
    setErrors(validate);
    if (Object.keys(validate).length) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    setLoading(true);
    try {
      const scrimDate = new Date(formData.date);
      const [startHour, startMin] = (formData.timeSlot.start || '00:00').split(':');
      const [endHour, endMin] = (formData.timeSlot.end || '00:00').split(':');

      const startTime = new Date(scrimDate);
      startTime.setHours(parseInt(startHour, 10), parseInt(startMin, 10), 0, 0);

      const endTime = new Date(scrimDate);
      endTime.setHours(parseInt(endHour, 10), parseInt(endMin, 10), 0, 0);

      const scrimData = {
        ...formData,
        date: scrimDate.toISOString(),
        timeSlot: { start: startTime.toISOString(), end: endTime.toISOString() },
        capacity: parseInt(formData.capacity, 10),
        entryFee: parseFloat(formData.entryFee) || 0,
        prizePool: parseFloat(formData.prizePool) || 0,
      };

      await scrimsAPI.create(scrimData);
      toast.success('Scrim created successfully!');
      onScrimCreated?.();

      setFormData({
        title: '',
        description: '',
        game: '',
        platform: 'Mobile',
        date: '',
        timeSlot: { start: '', end: '' },
        capacity: 10,
        entryFee: 0,
        prizePool: '',
        room: { id: '', password: '' },
      });
      setErrors({});
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create scrim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-black/70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,#6d28d9_0,#111827_55%,#0b0f1a_100%)] opacity-60" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 ring-1 ring-white/10">
              <Gamepad2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Create New Scrim</h2>
              <p className="mt-0.5 text-xs text-white/60">Set details and publish to players</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={submit} noValidate className="p-6">
          <div className="grid gap-6">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-white/70">Title *</label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    name="title"
                    type="text"
                    placeholder="Epic Valorant Scrim"
                    className={`w-full rounded-xl border px-10 py-2.75 text-sm text-white outline-none placeholder:text-white/40 bg-white/5 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 border-white/10 ${errors.title ? 'ring-2 ring-rose-500/40 border-rose-500/40' : ''}`}
                    value={formData.title}
                    onChange={onChange}
                    required
                  />
                </div>
                {errors.title && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-300">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-white/70">Game *</label>
                <div className="relative">
                  <Gamepad2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    name="game"
                    type="text"
                    placeholder="Valorant, BGMI, CS2, etc."
                    className={`w-full rounded-xl border px-10 py-2.75 text-sm text-white outline-none placeholder:text-white/40 bg-white/5 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 border-white/10 ${errors.game ? 'ring-2 ring-rose-500/40 border-rose-500/40' : ''}`}
                    value={formData.game}
                    onChange={onChange}
                    required
                  />
                </div>
                {errors.game && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-300">{errors.game}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs text-white/70">Description</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Describe your scrim rules, map, server, etc."
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                value={formData.description}
                onChange={onChange}
              />
            </div>

            {/* Date & Time */}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs text-white/70">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> Date *
                  </span>
                </label>
                <input
                  type="date"
                  name="date"
                  min={todayStr}
                  className={`w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.75 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 ${errors.date ? 'ring-2 ring-rose-500/40 border-rose-500/40' : ''}`}
                  value={formData.date}
                  onChange={onChange}
                  required
                />
                {errors.date && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-300">{errors.date}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-white/70">Start Time *</label>
                <input
                  type="time"
                  name="timeSlot.start"
                  className={`w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.75 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 ${errors.start ? 'ring-2 ring-rose-500/40 border-rose-500/40' : ''}`}
                  value={formData.timeSlot.start}
                  onChange={onChange}
                  required
                />
                {errors.start && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-300">{errors.start}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-white/70">End Time *</label>
                <input
                  type="time"
                  name="timeSlot.end"
                  className={`w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.75 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 ${errors.end ? 'ring-2 ring-rose-500/40 border-rose-500/40' : ''}`}
                  value={formData.timeSlot.end}
                  onChange={onChange}
                  required
                />
                {errors.end && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-300">{errors.end}</p>
                )}
              </div>
            </div>

            {/* Platform & Capacity */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-white/70">Platform</label>
                <select
                  name="platform"
                  className="w-full rounded-xl border border-white/10  px-4 py-2.75 text-sm bg-white/10 outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                  value={formData.platform}
                  onChange={onChange}
                > 
                  <option className='text-black' value="Mobile">Mobile</option>
                  <option className='text-black' value="PC" >PC</option>
                  <option className='text-black' value="PlayStation">PlayStation</option>
                  <option className='text-black' value="Xbox">Xbox</option>
                  
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-white/70">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-4 w-4" /> Capacity *
                  </span>
                </label>
                <input
                  type="number"
                  name="capacity"
                  min="2"
                  max="100"
                  className={`w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.75 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 ${errors.capacity ? 'ring-2 ring-rose-500/40 border-rose-500/40' : ''}`}
                  value={formData.capacity}
                  onChange={onChange}
                  required
                />
                {errors.capacity && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-300">{errors.capacity}</p>
                )}
              </div>
            </div>

            {/* Room Credentials */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-white/70">Room ID</label>
                <input
                  type="text"
                  name="room.id"
                  placeholder="Discord / Game Room ID"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.75 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                  value={formData.room.id}
                  onChange={onChange}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-white/70">Room Password</label>
                <input
                  type="text"
                  name="room.password"
                  placeholder="Room password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.75 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                  value={formData.room.password}
                  onChange={onChange}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-white/70">
                  <span className="inline-flex items-center gap-1">
                    <DollarSign className="h-4 w-4" /> Entry Fee (₹)
                  </span>
                </label>
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    type="number"
                    name="entryFee"
                    min="0"
                    step="1"
                    placeholder="0 (Free if 0)"
                    className={`w-full rounded-xl border px-10 py-2.75 text-sm text-white outline-none placeholder:text-white/40 bg-white/5 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 border-white/10 ${errors.entryFee ? 'ring-2 ring-rose-500/40 border-rose-500/40' : ''}`}
                    value={INR(formData.entryFee)}
                    onChange={onChange}
                  />
                </div>
                {errors.entryFee && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-300">{errors.entryFee}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-white/70">Prize Pool (₹)</label>
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    type="number"
                    name="prizePool"
                    min="0"
                    step="1"
                    placeholder="e.g., 5000"
                    className={`w-full rounded-xl border px-10 py-2.75 text-sm text-white outline-none placeholder:text-white/40 bg-white/5 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 border-white/10 ${errors.prizePool ? 'ring-2 ring-rose-500/40 border-rose-500/40' : ''}`}
                    value={INR(formData.prizePool)}
                    onChange={onChange}
                  />
                </div>
                {errors.prizePool && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-300">{errors.prizePool}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="group relative flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Creating…' : 'Create Scrim'}
                <span className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-indigo-400/20 opacity-0 blur transition group-hover:opacity-100" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateScrimModal;
