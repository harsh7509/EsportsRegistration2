// src/pages/EditTournament.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { tournamentsAPI } from "../services/api";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Calendar,
  Trophy,
  Pencil,
  CircleIndianRupeeIcon,
  Trash2,
  AlertTriangle,
} from "lucide-react";

const toISO = (v) => (v ? new Date(v).toISOString() : undefined);

export default function EditTournament() {
  const { id } = useParams();
  const nav = useNavigate();

  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    startAt: "",
    endAt: "",
    prizePool: "",
  });

  // delete state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await tournamentsAPI.get(id);
        const t = data?.tournament || data;

        setForm({
          title: t?.title || "",
          description: t?.description || "",
          startAt: t?.startAt ? t.startAt.slice(0, 16) : "",
          endAt: t?.endAt ? t.endAt.slice(0, 16) : "",
          prizePool:
            typeof t?.prizePool === "number"
              ? String(t.prizePool)
              : t?.prizePool || "",
        });
      } catch (e) {
        toast.error("Failed to load tournament");
      } finally {
        setBusy(false);
      }
    })();
  }, [id]);

  const datesInvalid = useMemo(() => {
    if (!form.startAt || !form.endAt) return false;
    const s = new Date(form.startAt);
    const e = new Date(form.endAt);
    return s.getTime() >= e.getTime();
  }, [form.startAt, form.endAt]);

  const change = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const submit = async (e) => {
    e.preventDefault();
    if (datesInvalid) {
      return toast.error("Start time must be before end time.");
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        startAt: toISO(form.startAt),
        endAt: toISO(form.endAt),
        prizePool:
          form.prizePool === ""
            ? undefined
            : isNaN(Number(form.prizePool))
            ? form.prizePool
            : Number(form.prizePool),
      };

      await tournamentsAPI.update(id, payload);
      toast.success("Tournament updated");
      nav("/tournaments");
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  // -------- SAFE DELETE: rooms -> groups -> tournament --------
  const deleteTournamentSafely = async () => {
    setDeleting(true);
    try {
      // fetch groups first
      const g = await tournamentsAPI.listGroups(id);
      const groups =
        Array.isArray(g?.data?.groups) ? g.data.groups :
        Array.isArray(g?.groups) ? g.groups : [];

      // 1) delete each group's room (best effort)
      for (const grp of groups) {
        try {
          await tournamentsAPI.deleteGroupRoom(id, grp._id);
        } catch (_) {}
      }

      // 2) delete each group (best effort)
      for (const grp of groups) {
        try {
          await tournamentsAPI.deleteGroup(id, grp._id);
        } catch (_) {}
      }

      // 3) delete tournament
      await tournamentsAPI.deleteTournament(id);

      toast.success("Tournament deleted");
      nav("/tournaments", { replace: true });
    } catch (e) {
      console.error("deleteTournamentSafely", e);
      toast.error(e?.response?.data?.message || "Failed to delete tournament");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  if (busy) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4">
        <div className="w-full max-w-2xl p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-white/10 rounded" />
            <div className="h-10 bg-white/10 rounded" />
            <div className="h-24 bg-white/10 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="h-10 bg-white/10 rounded" />
              <div className="h-10 bg-white/10 rounded" />
            </div>
            <div className="h-10 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-[#0b0f19] via-[#0d1224] to-[#111827] text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => nav(-1)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={saving || deleting}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 backdrop-blur-md transition-colors"
              title="Delete this tournament"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">Delete</span>
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
              <Pencil className="w-4 h-4 text-gaming-purple" />
              <span className="text-sm text-gray-200">Editing Tournament</span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
          <div className="p-6 border-b border-white/10">
            <h1 className="text-2xl font-bold">Edit Tournament</h1>
            <p className="text-sm text-gray-300 mt-1">
              Update the details and hit save when you're done.
            </p>
          </div>

          <form onSubmit={submit} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">Title</label>
              <div className="relative">
                <input
                  className="w-full rounded-xl bg-white/[0.06] border border-white/10 px-4 py-2.5 outline-none focus:ring-2 focus:ring-gaming-purple/50"
                  value={form.title}
                  onChange={(e) => change("title", e.target.value)}
                  placeholder="Ex: Summer Invitational 2025"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Description
              </label>
              <textarea
                className="w-full rounded-xl bg-white/[0.06] border border-white/10 px-4 py-3 h-28 outline-none focus:ring-2 focus:ring-gaming-purple/50 resize-none"
                value={form.description}
                onChange={(e) => change("description", e.target.value)}
                placeholder="Short overview, format, and any important rules..."
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Start At
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl bg-white/[0.06] border border-white/10 pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-gaming-purple/50"
                    value={form.startAt}
                    onChange={(e) => change("startAt", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  End At
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="datetime-local"
                    className={`w-full rounded-xl bg-white/[0.06] border pl-10 pr-3 py-2.5 outline-none focus:ring-2 ${
                      datesInvalid
                        ? "border-red-500/60 focus:ring-red-400/40"
                        : "border-white/10 focus:ring-gaming-purple/50"
                    }`}
                    value={form.endAt}
                    onChange={(e) => change("endAt", e.target.value)}
                    required
                  />
                </div>
                {datesInvalid && (
                  <p className="mt-1 text-xs text-red-400">
                    End time must be after the start time.
                  </p>
                )}
              </div>
            </div>

            {/* Prize Pool */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Prize Pool
              </label>
              <div className="relative">
                <CircleIndianRupeeIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className="w-full rounded-xl bg-white/[0.06] border border-white/10 pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-gaming-purple/50"
                  value={form.prizePool}
                  onChange={(e) => change("prizePool", e.target.value)}
                  placeholder='e.g. "5000" or "₹5,000 + goodies"'
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                You can enter a number (e.g. 5000) or a short text (e.g. “₹5,000
                + goodies”), depending on how you display it publicly.
              </p>
            </div>

            {/* Footer Actions */}
            <div className="pt-2 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 text-gray-300">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-sm opacity-80">
                  Make sure dates & prize pool are correct before saving.
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => nav(-1)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-md"
                  disabled={saving || deleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || deleting}
                  className="px-4 py-2.5 rounded-xl bg-gaming-purple hover:bg-gaming-purple/90 transition-colors disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Tiny legend */}
        <div className="mt-4 text-xs text-gray-400 flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-white/30" />
            glass
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gaming-purple/60" />
            primary
          </span>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151a26] p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-500/15 p-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Delete tournament?</h3>
                <p className="mt-1 text-sm text-white/70">
                  This will delete <b>all group rooms</b>, <b>all groups</b>, and the
                  tournament itself. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="btn-secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn-danger inline-flex items-center gap-2"
                onClick={deleteTournamentSafely}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
