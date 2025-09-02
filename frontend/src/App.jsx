import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

// Components
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import RoleGuard from './components/RoleGuard'

// Pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ScrimList from './pages/ScrimList'
import ScrimDetail from './pages/ScrimDetail'
import PlayerDashboard from './pages/PlayerDashboard'
import OrgDashboard from './pages/OrgDashboard'
import Rankings from './pages/Rankings'
import AdminPanel from './pages/AdminPanel'

function App() {
  return (
    <div className="min-h-screen bg-gaming-dark text-white">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/scrims" element={<ScrimList />} />
          <Route path="/scrims/:id" element={<ScrimDetail />} />
          <Route path="/rankings" element={<Rankings />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard/player" element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['player']}>
                <PlayerDashboard />
              </RoleGuard>
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard/org" element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['organization']}>
                <OrgDashboard />
              </RoleGuard>
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['admin']}>
                <AdminPanel />
              </RoleGuard>
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151'
          }
        }}
      />
    </div>
  )
}

export default App