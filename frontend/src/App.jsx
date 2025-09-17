import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import OrgTournamentCreate from './pages/OrgTournamentCreate';
import TournamentDetail from './pages/TournamentDetails';
import TournamentList from './pages/TournamentList';

import EditTournament from './pages/EditTournament';
import TournamentManage from './pages/TournamentManage';
import VerifyOrg from './pages/VerifyOrg';  


import ErrorBoundary from './ErrorBoundary';



// Lazy-load everything except the top nav so one bad page can't blank the app
const Navbar = lazy(() => import('./components/Navbar'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));
const RoleGuard = lazy(() => import('./components/RoleGuard'));

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ScrimList = lazy(() => import('./pages/ScrimList'));
const ScrimDetail = lazy(() => import('./pages/ScrimDetail'));
const PlayerDashboard = lazy(() => import('./pages/PlayerDashboard'));
const OrgDashboard = lazy(() => import('./pages/OrgDashboard'));
const Rankings = lazy(() => import('./pages/Rankings'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const OrganizationProfile = lazy(() => import('./pages/OrganizationProfile'));
const NotFound = lazy(() => import('./pages/NotFound'));


const Fallback = ({ label = 'Loading…' }) => (
  <div style={{ padding: 16, opacity: 0.8 }}>{label}</div>
);

function App() {
  return (
    <div className="min-h-screen bg-gaming-dark text-white">
      {/* TEMP heartbeat: proves the shell rendered; remove later */}
      <div style={{ position: 'fixed', bottom: 12, right: 12, fontSize: 12, opacity: 0.7, zIndex: 10 }}>
        UI loaded ✅
      </div>

      <Suspense fallback={<Fallback label="Loading navbar…" />}>
        <ErrorBoundary>
          <Navbar />
        </ErrorBoundary>
      </Suspense>

      <main>
        <Suspense fallback={<Fallback label="Loading page…" />}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/scrims" element={<ScrimList />} />
              <Route path="/scrims/:id" element={<ScrimDetail />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/organizations/:orgId" element={<OrganizationProfile />} />
              <Route path="/tournaments/new" element={<OrgTournamentCreate />} />
              <Route path="/tournaments/:id" element={<TournamentDetail />} />
              <Route path="/tournaments" element={<TournamentList />} />
              <Route path="/tournaments/:id/edit" element={<EditTournament />} />
              
             
<Route path="/tournaments/:id/manage" element={<TournamentManage />} />
 <Route
   path="/org/verify"
   element={
     <ProtectedRoute>
       <RoleGuard allowedRoles={['organization']}>
         <VerifyOrg />
       </RoleGuard>
     </ProtectedRoute>
   }
 />



              {/* Protected */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <RoleGuard allowedRoles={['admin']}>
                      <AdminPanel />
                    </RoleGuard>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/player"
                element={
                  <ProtectedRoute>
                    <RoleGuard allowedRoles={['player']}>
                      <PlayerDashboard />
                    </RoleGuard>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/org"
                element={
                  <ProtectedRoute>
                    <RoleGuard allowedRoles={['organization']}>
                      <OrgDashboard />
                    </RoleGuard>
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </Suspense>
      </main>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' }
        }}
      />
    </div>
  );
}

export default App;
