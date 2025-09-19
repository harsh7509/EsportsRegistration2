// src/pages/AdminKycReview.jsx
import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, ShieldCheck, Eye, BadgeInfo, Copy, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminAPI } from '../services/api';

export default function AdminKycReview() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-black via-gaming-dark to-[#0c0c14] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 border border-gray-700"
              title="Back to Admin"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Organization KYC Review</h1>
              <p className="text-gray-400">Inspect documents, add notes, and approve or reject.</p>
            </div>
          </div>
          <Link
            to="/admin"
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm"
          >
            Admin Dashboard
          </Link>
        </div>

        <KycReviewPanel />
      </div>
    </div>
  );
}

/* ======================= KYC (PRO REVIEW UI) ======================= */
export function KycReviewPanel() {
  const [loading, setLoading] = useState(true);
  const [kycItems, setKycItems] = useState([]);
  const [selected, setSelected] = useState(null);   // current item to review
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.listOrgKyc();
      setKycItems(res?.data?.items || []);
    } catch (e) {
      toast.error('Failed to load KYC list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Submissions</h2>
        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm"
          title="Refresh"
        >
          Refresh
        </button>
      </div>

      {/* Summary list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading && (
          <div className="col-span-full flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading…
          </div>
        )}

        {!loading && !kycItems.length && (
          <div className="col-span-full text-gray-400">No KYC submissions yet</div>
        )}

        {kycItems.map((item) => (
          <KycCard
            key={item._id}
            item={item}
            onReview={() => {
              setSelected(item);
              setOpen(true);
            }}
            onChanged={load}
          />
        ))}
      </div>

      {/* Full-screen modal for deep review */}
      {open && selected && (
        <KycReviewModal
          item={selected}
          onClose={() => { setOpen(false); setSelected(null); }}
          onChanged={load}
        />
      )}
    </div>
  );
}

/* ---------- Small summary card with quick status & open "Review" ---------- */
function KycCard({ item, onReview, onChanged }) {
  const status = item?.orgKyc?.status || 'unsubmitted';

  const Badge = ({ children, variant='default' }) => {
    const map = {
      pending:  'bg-yellow-500/15 text-yellow-300 border-yellow-700/40',
      approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-700/40',
      rejected: 'bg-red-500/15 text-red-300 border-red-700/40',
      default:  'bg-gray-800 text-gray-300 border-gray-700'
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${map[variant] || map.default}`}>
        {children}
      </span>
    );
  };

  return (
    <div className="p-4 rounded-2xl border border-gray-800 bg-gray-900/60 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{item?.name} <span className="text-gray-500">•</span> {item?.email}</div>
          <div className="text-xs text-gray-400 mt-1">
            Submitted: {fmtDate(item?.orgKyc?.submittedAt) || '—'}
          </div>
        </div>
        <div>
          {status === 'pending'   && <Badge variant="pending">Pending</Badge>}
          {status === 'approved'  && <Badge variant="approved">Approved</Badge>}
          {status === 'rejected'  && <Badge variant="rejected">Rejected</Badge>}
          {!['pending','approved','rejected'].includes(status) && <Badge>Not submitted</Badge>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-800">
          <div className="text-gray-400 text-xs">Legal</div>
          <div className="font-medium">{item?.orgKyc?.legalName || '—'}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-800">
          <div className="text-gray-400 text-xs">DOB</div>
          <div className="font-medium">{fmtDate(item?.orgKyc?.dob) || '—'}</div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gaming-purple/20 hover:bg-gaming-purple/30 border border-gaming-purple/40"
          onClick={onReview}
        >
          <Eye className="w-4 h-4" /> Review
        </button>
        {item?.orgKyc?.status === 'pending' && (
          <>
            <QuickApprove id={item._id} onDone={onChanged} />
            <QuickReject id={item._id} onDone={onChanged} />
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Quick approve/reject buttons (no notes) ---------- */
function QuickApprove({ id, onDone }) {
  return (
    <button
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-700/40 text-emerald-300"
      onClick={async () => {
        await adminAPI.reviewOrgKyc(id, 'approve');
        toast.success('KYC approved');
        onDone?.();
      }}
    >
      <CheckCircle2 className="w-4 h-4" /> Approve
    </button>
  );
}
function QuickReject({ id, onDone }) {
  return (
    <button
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-700/40 text-red-300"
      onClick={async () => {
        await adminAPI.reviewOrgKyc(id, 'reject');
        toast.success('KYC rejected');
        onDone?.();
      }}
    >
      <XCircle className="w-4 h-4" /> Reject
    </button>
  );
}

/* ---------- Full-screen modal with UNMASKED details & images ---------- */
function KycReviewModal({ item, onClose, onChanged }) {
  const [notes, setNotes] = useState(item?.orgKyc?.notes || '');
  const [submitting, setSubmitting] = useState(false);

  const close = () => onClose?.();

  const decide = async (action) => {
    setSubmitting(true);
    try {
      await adminAPI.reviewOrgKyc(item._id, action, notes);
      toast.success(`KYC ${action === 'approve' ? 'approved' : 'rejected'}`);
      onChanged?.();
      close();
    } catch (e) {
      toast.error('Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const info = item?.orgKyc || {};
  const status = info?.status || 'pending';

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="absolute inset-0 flex items-start justify-center p-4 md:p-8 overflow-y-auto">
        <div className="w-full max-w-5xl bg-[#0c0c14] border border-gray-800 rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-gray-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-gaming-purple" />
                <h3 className="text-lg md:text-xl font-semibold">KYC Review — {item?.name}</h3>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Email: {item?.email} • Submitted {fmtDateTime(info?.submittedAt) || '—'}
              </div>
            </div>
            <StatusPill status={status} />
          </div>

          {/* Body */}
          <div className="p-4 md:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Details */}
              <div className="md:col-span-2 space-y-4">
                <Section title="Owner Details">
                  <Field label="Legal name" value={info?.legalName || '—'} />
                  <Field label="Email" value={info?.email || '—'} />
                  <Field label="Date of birth" value={fmtDate(info?.dob) || '—'} />
                  <Field label="Aadhaar number" value={info?.aadhaarNumber || '—'} copyable />
                </Section>

                <Section title="Images">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ImageCard title="Aadhaar card" url={info?.aadhaarImageUrl} />
                    <ImageCard title="Selfie with Aadhaar" url={info?.selfieWithAadhaarUrl} />
                  </div>
                  <p className="mt-2 text-xs text-gray-400 flex items-center gap-2">
                    <BadgeInfo className="w-4 h-4" />
                    Click image to open in new tab for zoomed inspection.
                  </p>
                </Section>
              </div>

              {/* Decision panel */}
              <div className="space-y-4">
                <Section title="Decision">
                  <textarea
                    className="w-full h-36 rounded-xl bg-gray-900/60 border border-gray-800 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-gaming-purple"
                    placeholder="Add internal review notes (optional)…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      disabled={submitting}
                      onClick={() => decide('approve')}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approve
                    </button>
                    <button
                      disabled={submitting}
                      onClick={() => decide('reject')}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Reject
                    </button>
                    <button
                      onClick={close}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700"
                    >
                      Close
                    </button>
                  </div>
                </Section>

                <Section title="Audit">
                  <Field label="Status" value={capitalize(info?.status || 'pending')} />
                  <Field label="Submitted at" value={fmtDateTime(info?.submittedAt) || '—'} />
                  <Field label="Reviewed at" value={fmtDateTime(info?.reviewedAt) || '—'} />
                  <Field label="Reviewed by" value={info?.reviewedBy || '—'} />
                </Section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- UI atoms ----------------------------- */
function StatusPill({ status }) {
  const map = {
    pending:  'bg-yellow-500/15 text-yellow-300 border-yellow-700/40',
    approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-700/40',
    rejected: 'bg-red-500/15 text-red-300 border-red-700/40',
  };
  const txt = capitalize(status || 'pending');
  const cls = map[status] || 'bg-gray-800 text-gray-300 border-gray-700';
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${cls}`}>
      {status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> :
       status === 'rejected' ? <XCircle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
      {txt}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
      <div className="text-sm font-semibold mb-3">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value, copyable }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value || ''));
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-sm font-medium text-right break-all">
        {value || '—'}
      </div>
      {copyable && value ? (
        <button
          onClick={copy}
          className="ml-2 p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700"
          title="Copy"
        >
          <Copy className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  );
}

function ImageCard({ title, url }) {
  return (
    <a
      href={url || '#'}
      target="_blank"
      rel="noreferrer"
      className={[
        "group block overflow-hidden rounded-xl border",
        url ? "border-gray-800 hover:border-gray-700" : "border-dashed border-gray-700 pointer-events-none"
      ].join(' ')}
    >
      <div className="bg-gray-900/60 p-2 border-b border-gray-800 flex items-center justify-between">
        <div className="text-xs text-gray-300">{title}</div>
        {!!url && <span className="text-[10px] text-gray-500 group-hover:text-gray-300">Open</span>}
      </div>
      <div className="aspect-video bg-black/30 flex items-center justify-center">
        {url ? (
          <img src={url} alt={title} className="w-full h-full object-contain" />
        ) : (
          <span className="text-gray-500 text-xs">No image</span>
        )}
      </div>
    </a>
  );
}

/* ----------------------------- helpers ----------------------------- */
function fmtDate(d) {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x)) return '';
  return x.toISOString().slice(0, 10);
}
function fmtDateTime(d) {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x)) return '';
  return x.toLocaleString();
}
function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
