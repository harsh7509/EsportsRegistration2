import React, { useState } from 'react';
import { tournamentsAPI, uploadAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const OrgTournamentCreate = () => {
  const { user } = useAuth();
  if (!user || user.role !== 'organization') {
    return <div className="p-6">Only organizations can create tournaments.</div>;
  }

  const [form, setForm] = useState({
    title: '',
    bannerUrl: '',
    description: '',
    game: '',
    rules: '',
    entryFee: 0,
    capacity: 20000,
    startAt: '',
    endAt: ''
  });
  const [uploading, setUploading] = useState(false);

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await uploadAPI.uploadImage(file);
      const url = res?.data?.imageUrl || res?.data?.avatarUrl;
      if (!url) throw new Error('No imageUrl returned');
      setForm((f) => ({ ...f, bannerUrl: url }));
      toast.success('Banner uploaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload banner');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const toISO = (v) => (v ? new Date(v).toISOString() : undefined);
     await tournamentsAPI.create({
       ...form,
       startAt: toISO(form.startAt),
       endAt:   toISO(form.endAt),
       entryFee: Number(form.entryFee) || 0,
       capacity: Math.max(1, Number(form.capacity) || 20000),
   });
      toast.success('Tournament created');
      setForm({
        title: '', bannerUrl: '', description: '', game: '', rules: '',
        entryFee: 0, capacity: 20000, startAt: '', endAt: ''
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to create tournament');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create Tournament</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Title</label>
          <input className="input w-full" value={form.title} onChange={onChange('title')} required />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Game</label>
            <input className="input w-full" value={form.game} onChange={onChange('game')} />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Entry Fee (₹)</label>
            <input type="number" className="input w-full" value={form.entryFee} onChange={onChange('entryFee')} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Capacity</label>
            <input
              type="number"
              min="1"
              max="1000000"
              className="input w-full"
              value={form.capacity}
              onChange={onChange('capacity')}
            />
            <p className="text-xs text-gray-400 mt-1">You can set 20,000+ slots.</p>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Start At</label>
            <input type="datetime-local" className="input w-full" value={form.startAt} onChange={onChange('startAt')} />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-2">End At (optional)</label>
          <input type="datetime-local" className="input w-full" value={form.endAt} onChange={onChange('endAt')} />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-2">Description</label>
          <textarea className="input w-full h-24" value={form.description} onChange={onChange('description')} />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-2">Rules (Markdown/Plain)</label>
          <textarea className="input w-full h-28" value={form.rules} onChange={onChange('rules')} />
        </div>

        <div className="grid md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Banner URL (optional)</label>
            <input className="input w-full" value={form.bannerUrl} onChange={onChange('bannerUrl')} />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Or Upload Banner</label>
            <input type="file" accept="image/*" onChange={handleBannerUpload} disabled={uploading} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary">Create Tournament</button>
        </div>
      </form>
    </div>
  );
};

export default OrgTournamentCreate;
