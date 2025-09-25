import React, { useMemo, useRef, useState } from 'react';
import {
  Image as ImageIcon, X, Upload, Loader2, Calendar, Users, IndianRupee, Hash, FileText,
  Eye, Edit3, Plus, Minus, CheckCircle2, AlertCircle

} from 'lucide-react';
import { tournamentsAPI, uploadAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';



const MaxLen = {
  title: 120,
  game: 60,
  desc: 1000,
  rules: 4000,
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n || 0));

const FieldLabel = ({ children, hint, req }) => (
  <div className="mb-1.5 flex items-center justify-between">
    <label className="text-xs text-white/70">{children}{req && <span className="text-rose-300 ml-1">*</span>}</label>
    {hint ? <span className="text-[11px] text-white/50">{hint}</span> : null}
  </div>
);

const Input = (props) => (
  <input
    {...props}
    className={`w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 ${props.className || ''}`}
  />
);

const Textarea = (props) => (
  <textarea
    {...props}
    className={`w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 ${props.className || ''}`}
  />
);

const Pill = ({ children }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-[3px] text-[11px] text-white/80">
    {children}
  </span>
);

const BannerDrop = ({ value, onChange, onUploadStart, onUploadEnd, disabled }) => {
  const fileRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const onPick = () => fileRef.current?.click();

  const upload = async (file) => {
    if (!file) return;
    try {
      onUploadStart?.();
      const res = await uploadAPI.uploadImage(file);
      const url = res?.data?.imageUrl || res?.data?.avatarUrl;
      if (!url) throw new Error('No imageUrl returned');
      onChange(url);
      toast.success('Banner uploaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to upload banner');
    } finally {
      onUploadEnd?.();
    }
  };

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(false);
    if (disabled) return;
    const file = e.dataTransfer?.files?.[0];
    upload(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={`relative overflow-hidden rounded-2xl border border-dashed ${value ? 'border-white/10' : 'border-white/15'} ${drag ? 'bg-white/5' : 'bg-white/5'} `}
    >
      {value ? (
        <div className="relative">
          <img src={value} alt="Banner" className="h-44 w-full object-cover" />
          <div className="absolute right-3 top-3 flex gap-2">
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded-full bg-black/60 p-2 text-white hover:bg-black/70"
              title="Remove"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onPick}
              disabled={disabled}
              className="rounded-full bg-indigo-500 p-2 text-white hover:bg-indigo-600 disabled:opacity-60"
              title="Replace banner"
            >
              <Upload className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-3 p-8 text-white/80"
          title="Upload banner"
        >
          <ImageIcon className="h-5 w-5" />
          <span>Drag & drop or click to upload banner</span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.currentTarget.value = '';
        }}
      />
    </div>
  );
};

const OrgTournamentCreate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
   const isOrg = !!user && user.role === 'organization';

  const [form, setForm] = useState({
    title: '',
    bannerUrl: '',
    description: '',
    game: '',
    rules: '',
    prizepool: '',
    entryFee: 0,
    capacity: 20000,
    startAt: '',
    endAt: ''
  });

  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('rules'); // rules | preview
  const [submitting, setSubmitting] = useState(false);

  const filled = useMemo(() => {
    const req = ['title', 'startAt'];
    const n = req.filter((k) => String(form[k]).trim()).length;
    return Math.round((n / req.length) * 100);
  }, [form]);

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.startAt) return toast.error('Start date/time is required');

    const toISO = (v) => (v ? new Date(v).toISOString() : undefined);

    try {
      setSubmitting(true);
      await tournamentsAPI.create({
        ...form,
        title: form.title.trim().slice(0, MaxLen.title),
        game: form.game.trim().slice(0, MaxLen.game),
        description: form.description.slice(0, MaxLen.desc),
        rules: form.rules.slice(0, MaxLen.rules),
        startAt: toISO(form.startAt),
        endAt: toISO(form.endAt),
        entryFee: clamp(Number(form.entryFee), 0, 1_00_00_000), // up to 1 crore (₹) if you ever need
        capacity: clamp(Number(form.capacity), 1, 1_000_000),
        prizePool: String(form.prizePool ?? '').trim(),
   // also send numeric form for BE convenience if user typed a number
    prizePoolTotal: Number.isFinite(Number(form.prizePool)) ? Number(form.prizePool) : undefined,
      });

      toast.success('Tournament created');
      navigate('/tournaments');
      
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to create tournament');
    } finally {
      setSubmitting(false);
    }
  };

  const feeLabel = useMemo(() => {
    const n = Number(form.entryFee) || 0;
    return n > 0 ? `₹${n.toLocaleString('en-IN')}` : 'Free';
  }, [form.entryFee]);

   // prevent picking past times in the picker
 const minStart = useMemo(() => {
   const d = new Date();
   d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
   return d.toISOString().slice(0,16); // YYYY-MM-DDTHH:mm
 }, []);

 return !isOrg ? (
    <div className="p-6">Only organizations can create tournaments.</div>
  ) : (
    <div className="mx-auto max-w-5xl p-6">
      {/* Heading */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Tournament</h1>
          <p className="text-sm text-white/60">Fill the basics, set timing, add details & publish.</p>
        </div>
        <div className="flex items-center gap-2">
          <Pill><CheckCircle2 className="h-3.5 w-3.5" /> Required fields 2/2</Pill>
          <Pill>Progress: {filled}%</Pill>
        </div>
      </div>

      {/* Layout */}
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.3fr_.9fr]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Banner */}
          <BannerDrop
            value={form.bannerUrl}
            onChange={(url) => setForm((f) => ({ ...f, bannerUrl: url }))}
            onUploadStart={() => setUploading(true)}
            onUploadEnd={() => setUploading(false)}
            disabled={uploading || submitting}
          />

          {/* Title & Game */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel req hint={`${form.title.length}/${MaxLen.title}`}>Title</FieldLabel>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.slice(0, MaxLen.title) }))}
                placeholder="e.g., BGMI Solo Showdown"
              />
            </div>
            <div>
              <FieldLabel hint={`${form.game.length}/${MaxLen.game}`}>Game</FieldLabel>
              <div className="relative">
                <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input
                  value={form.game}
                  onChange={(e) => setForm((f) => ({ ...f, game: e.target.value.slice(0, MaxLen.game) }))}
                  placeholder="e.g., BGMI / Valorant / Free Fire"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Fee, Prize Pool & Capacity */}
 <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel hint={feeLabel}>Entry Fee (₹)</FieldLabel>
         
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input
                  type="number"
                  min={0} 
                  step="1"
                  value={form.entryFee}
                  onChange={onChange('entryFee')}
                  className="pl-9"
                  placeholder="0 for Free"
                />
              </div>
            </div>
                 <div>
    <FieldLabel hint="">Prize Pool (₹)</FieldLabel>
    <div className="relative">
      <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
      <Input
        type="text"
        inputMode="decimal"
        value={form.prizePool}
        onChange={(e) => setForm((f) => ({ ...f, prizePool: e.target.value }))}
        className="pl-9"
        placeholder="e.g., 5000 "
      />
    </div>
  </div>

            <div>
              <FieldLabel hint="1 to 1,000,000">Slots</FieldLabel>
              <div className="flex">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, capacity: clamp((Number(f.capacity) || 0) - 10, 1, 1_000_000) }))}
                  className="rounded-l-xl border border-white/10 bg-white/5 px-3 py-2.5 hover:bg-white/10"
                  title="Decrease"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <Input
                  type="number"
                  min="1"
                  max="1000000"
                  value={form.capacity}
                  onChange={onChange('capacity')}
                  className="rounded-none"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, capacity: clamp((Number(f.capacity) || 0) + 10, 1, 1_000_000) }))}
                  className="rounded-r-xl border border-white/10 bg-white/5 px-3 py-2.5 hover:bg-white/10"
                  title="Increase"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {/* <p className="mt-1 text-[11px] text-white/50">Large events supported (20,000+ players).</p> */}
            </div>
          </div>

          {/* Scheduling */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel req>Start At</FieldLabel>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input type="datetime-local" min={minStart} value={form.startAt} onChange={onChange('startAt')} className="pl-9" />

              </div>
            </div>
            <div>
              <FieldLabel>End At (optional)</FieldLabel>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input type="datetime-local" value={form.endAt} onChange={onChange('endAt')} className="pl-9" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <FieldLabel hint={`${form.description.length}/${MaxLen.desc}`}>Description</FieldLabel>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, MaxLen.desc) }))}
              placeholder="Short overview of the tournament, format, requirements…"
            />
          </div>

          {/* Rules with tabs */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <FieldLabel hint={`${form.rules.length}/${MaxLen.rules}`}>Rules (Markdown / Plain)</FieldLabel>
              <div className="ml-auto inline-flex rounded-lg border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setTab('rules')}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs ${tab==='rules'?'bg-indigo-500 text-white':'text-white/80 hover:bg-white/10'}`}
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setTab('preview')}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs ${tab==='preview'?'bg-indigo-500 text-white':'text-white/80 hover:bg-white/10'}`}
                >
                  <Eye className="h-3.5 w-3.5" /> Preview
                </button>
              </div>
            </div>
            {tab === 'rules' ? (
              <Textarea
                rows={6}
                value={form.rules}
                onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value.slice(0, MaxLen.rules) }))}
                placeholder="e.g., 1) Players must use the registered IGN…"
              />
            ) : (
              <div className="prose prose-invert max-w-none rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white">
                {form.rules ? form.rules : <span className="text-white/50">Nothing to preview yet.</span>}
              </div>
            )}
          </div>
        </div>

        {/* Right column — Live Preview */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 text-sm text-white/70">Card Preview</div>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
              <div className="relative">
                {form.bannerUrl ? (
                  <img src={form.bannerUrl} alt="Preview" className="h-36 w-full object-cover" />
                ) : (
                  <div className="h-36 w-full bg-[radial-gradient(900px_450px_at_20%_10%,#6d28d9_0,#111827_55%,#0b0f1a_100%)]" />
                )}
                <div className="absolute left-3 top-3 flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">Upcoming</span>
                  <span className="rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white/80">{feeLabel}</span>
                </div>
              </div>
              <div className="p-3">
                <div className="line-clamp-1 text-[15px] font-semibold">{form.title || 'Tournament title'}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-white/70">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="line-clamp-1">{form.game || 'Game'}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 items-center gap-2 text-xs text-white/70">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="line-clamp-1">{form.startAt ? new Date(form.startAt).toLocaleString() : 'Start TBA'}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>0/{Number(form.capacity||0).toLocaleString('en-IN')} slots</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-white/60">
              This is how it will look in lists. Banner strongly improves CTR.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 text-sm font-semibold">Tips</div>
            <ul className="list-disc pl-5 text-xs leading-6 text-white/70">
              <li>Keep title short & clear (format, mode, prize if any).</li>
              <li>Set correct time zone in your system for accurate scheduling.</li>
              <li>Rules should cover eligibility, format, and disqualification criteria.</li>
            </ul>
          </div>
        </aside>

        {/* Sticky actions */}
        <div className="lg:col-span-2 sticky bottom-4 z-10 mt-2 flex items-center justify-end gap-2 rounded-2xl border border-white/10 bg-gray-900/70 p-3 backdrop-blur supports-[backdrop-filter]:bg-gray-900/50">
          <div className="mr-auto text-xs text-white/70 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Required: Title & Start At</span>
          </div>
          <button
            type="button"
            onClick={() =>
              setForm({
                title: '', bannerUrl: '', description: '', game: '', rules: '',
                entryFee: 0, capacity: 20000, startAt: '', endAt: ''
              })
            }
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10"
            disabled={uploading || submitting}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={uploading || submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-70"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {submitting ? 'Creating…' : 'Create Tournament'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrgTournamentCreate;
