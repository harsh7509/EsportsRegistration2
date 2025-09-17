import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Users, Trophy, MapPin, ExternalLink } from 'lucide-react';
import { tournamentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const emptyPlayer = () => ({ ignName: '', ignId: '' });

const TournamentDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  // NEW: inline registration form state
  const [showRegForm, setShowRegForm] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [phone, setPhone] = useState('');
  const [realName, setRealName] = useState('');
  const [players, setPlayers] = useState([emptyPlayer(), emptyPlayer(), emptyPlayer(), emptyPlayer(), emptyPlayer()]); // 5th optional

  useEffect(() => {
    (async () => {
      try {
        const res = await (tournamentsAPI.getDetails
          ? tournamentsAPI.getDetails(id)
          : tournamentsAPI.get(id));
        const doc = res?.data?.tournament || res?.data || null;
        setT(doc);
      } catch (e) {
        console.error('Fetch tournament error:', e);
        toast.error('Failed to load tournament');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const submitRegister = async () => {
    try {
      if (!user) return toast.error('Please sign in to register');

      // basic client-side checks
      const p = players.slice(0, 5);
      const firstFourOk = p.slice(0, 4).every(pp => pp.ignName.trim() && pp.ignId.trim());
      if (!teamName.trim()) return toast.error('Team name required');
      if (!phone.trim()) return toast.error('Phone number required');
      if (!realName.trim()) return toast.error('Your real name required');
      if (!firstFourOk) return toast.error('Players 1–4 need IGN name & ID');

      setRegistering(true);
      const res = await tournamentsAPI.register(t?._id || id, {
        teamName,
        phone,
        realName,
        players: p.filter(x => x.ignName || x.ignId), // send 4–5
      });
      const updated = res?.data?.tournament || res?.data;

      setT(prev =>
        updated || (prev ? { ...prev, registeredCount: (prev.registeredCount || 0) + 1 } : prev)
      );
      setShowRegForm(false);
      toast.success('Registered!');
    } catch (e) {
      console.error('Register failed:', e);
      toast.error(e?.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return <div className="max-w-5xl mx-auto p-6">Loading...</div>;
  if (!t) return <div className="max-w-5xl mx-auto p-6 text-red-400">Tournament not found</div>;

  const dateValue = t?.startAt || t?.timeSlot?.start || t?.date;
  const dateStr = dateValue ? new Date(dateValue).toLocaleString() : 'TBA';
  const org = typeof t.organizationId === 'object' ? t.organizationId : null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {t.bannerUrl && <img src={t.bannerUrl} alt={t.title} className="w-full h-64 object-cover" />}

        <div className="p-6">
          <h1 className="text-3xl font-bold mb-2">{t.title}</h1>

          {org && (
            <div className="flex items-center gap-3 text-gray-300 mb-4">
              <div className="w-10 h-10 rounded-full bg-gaming-purple grid place-items-center overflow-hidden">
                {org.avatarUrl ? (
                  <img src={org.avatarUrl} alt={org.name || org.organizationInfo?.orgName || 'Org'} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold">
                    {(org.name || org.organizationInfo?.orgName || 'O')?.[0]}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-medium">
                  {org.name || org.organizationInfo?.orgName || 'Organization'}
                </span>
                {org.organizationInfo?.location && (
                  <span className="text-sm flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {org.organizationInfo.location}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-4 text-gray-200 mb-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              {dateStr}
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              {(t.registeredCount || 0)}/{t.capacity || 0} slots
            </div>
            <div className="flex items-center text-green-400">
              <Trophy className="h-4 w-4 mr-2" />
              ₹{t.entryFee || 0}
            </div>
          </div>

          {t.description && <p className="text-gray-300 mb-4">{t.description}</p>}

          {t.rules && (
            <>
              <h3 className="text-lg font-semibold mb-2">Rules</h3>
              <div className="prose prose-invert max-w-none mb-4 text-gray-300 whitespace-pre-wrap">
                {t.rules}
              </div>
            </>
          )}

          {t.prizes && (
            <>
              <h3 className="text-lg font-semibold mb-2">Prizes</h3>
              <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
                {t.prizes}
              </div>
            </>
          )}

          {/* Register area */}
          <div className="flex gap-3 pt-4">
            {t.registrationUrl ? (
              <a href={t.registrationUrl} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center">
                Register Now <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            ) : (
              <button onClick={() => setShowRegForm(v => !v)} className="btn-primary">
                {showRegForm ? 'Hide Form' : 'Register Now'}
              </button>
            )}

            {org?._id && (
              <Link to={`/organizations/${org._id}`} className="btn-secondary">
                Organization Page
              </Link>
            )}
          </div>

          {/* Inline Registration Form */}
          {showRegForm && (
            <div className="mt-4 p-4 rounded bg-gray-900 border border-gray-700 space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <input className="input" placeholder="Team name" value={teamName} onChange={e => setTeamName(e.target.value)} />
                <input className="input" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />
                <input className="input" placeholder="Your real name" value={realName} onChange={e => setRealName(e.target.value)} />
              </div>

              <div className="grid md:grid-cols-5 gap-3">
                {players.map((p, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="text-xs text-gray-400">Player {idx + 1}{idx < 4 ? ' *' : ' (optional)'}</div>
                    <input className="input" placeholder="IGN name" value={p.ignName}
                      onChange={e => {
                        const a = [...players]; a[idx] = { ...a[idx], ignName: e.target.value }; setPlayers(a);
                      }} />
                    <input className="input" placeholder="IGN ID" value={p.ignId}
                      onChange={e => {
                        const a = [...players]; a[idx] = { ...a[idx], ignId: e.target.value }; setPlayers(a);
                      }} />
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button className="btn-primary" disabled={registering} onClick={submitRegister}>
                  {registering ? 'Registering…' : 'Submit Registration'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentDetails;
