import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Users, Trophy, MapPin, ExternalLink } from 'lucide-react';
import { tournamentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TournamentDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Works with either tournamentsAPI.getDetails(id) or tournamentsAPI.get(id)
        const res = await (tournamentsAPI.getDetails
          ? tournamentsAPI.getDetails(id)
          : tournamentsAPI.get(id));

        // Accept both { tournament } and plain document
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

  const handleRegister = async () => {
    try {
      if (!user) {
        toast.error('Please sign in to register');
        return;
      }

      const tid = t?._id || id;
      if (!tid) {
        toast.error('Missing tournament id');
        return;
      }

      setRegistering(true);
      const res = await tournamentsAPI.register(tid);
      const updated = res?.data?.tournament || res?.data;

      // Update the local view
      setT(prev => updated || (prev ? { ...prev, registeredCount: (prev.registeredCount || 0) + 1 } : prev));
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

  // Normalize date
  const dateValue = t?.startAt || t?.timeSlot?.start || t?.date;
  const dateStr = dateValue ? new Date(dateValue).toLocaleString() : 'TBA';

  // Normalize org (could be object or id string)
  const org = typeof t.organizationId === 'object' ? t.organizationId : null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {t.bannerUrl && (
          <img src={t.bannerUrl} alt={t.title} className="w-full h-64 object-cover" />
        )}

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

          <div className="flex gap-3 pt-4">
            {t.registrationUrl ? (
              <a
                href={t.registrationUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary inline-flex items-center"
              >
                Register Now <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            ) : (
              <button onClick={handleRegister} className="btn-primary" disabled={registering}>
                {registering ? 'Registering…' : 'Register Now'}
              </button>
            )}

            {org?._id && (
              <Link to={`/organizations/${org._id}`} className="btn-secondary">
                Organization Page
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentDetails;
