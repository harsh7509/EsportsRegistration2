// src/pages/EditTournament.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tournamentsAPI } from '../services/api';
import toast from 'react-hot-toast';

const toISO = (v) => (v ? new Date(v).toISOString() : undefined);

export default function EditTournament() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await tournamentsAPI.get(id);
        const t = data?.tournament || data; // (controller shape के हिसाब से)
        setForm({
          ...t,
          startAt: t.startAt ? t.startAt.slice(0,16) : '',
          endAt:   t.endAt   ? t.endAt.slice(0,16)   : '',
        });
      } catch (e) {
        toast.error('Failed to load tournament');
      } finally {
        setBusy(false);
      }
    })();
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        startAt: toISO(form.startAt),
        endAt: toISO(form.endAt),
      };
      await tournamentsAPI.update(id, payload);
      toast.success('Tournament updated');
      nav('/tournaments'); // अपनी listing route
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  if (busy || !form) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 card">
      <h1 className="text-2xl font-bold mb-4">Edit Tournament</h1>
      <form onSubmit={submit} className="space-y-4">
        <input className="input w-full" value={form.title} onChange={(e)=>setForm(f=>({...f,title:e.target.value}))}/>
        <textarea className="input w-full h-24" value={form.description} onChange={(e)=>setForm(f=>({...f,description:e.target.value}))}/>
        <label className="block text-sm text-gray-300">Start At</label>
        <input type="datetime-local" className="input w-full" value={form.startAt} onChange={(e)=>setForm(f=>({...f,startAt:e.target.value}))}/>
        <label className="block text-sm text-gray-300">End At</label>
        <input type="datetime-local" className="input w-full" value={form.endAt} onChange={(e)=>setForm(f=>({...f,endAt:e.target.value}))}/>
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </form>
    </div>
  );
}
