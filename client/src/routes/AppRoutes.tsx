import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import PublicLayout from '../layouts/PublicLayout'
import AppLayout from '../layouts/AppLayout'
import Landing from '../pages/Landing'
import About from '../pages/About'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Dashboard from '../pages/Dashboard'
import SchedulePage from '../pages/Schedule'
import Tasks from '../pages/Tasks'
import ServiceRequests from '../pages/ServiceRequests'
import ServiceRequestDetail from '../pages/ServiceRequestDetail'
import Appointments from '../pages/Appointments'
import Reservations from '../pages/Reservations'
import Events from '../pages/Events'
import Announcements from '../pages/Announcements'
import SearchPage from '../pages/Search'
import NotFound from '../pages/NotFound'
import AdminDashboard from '../pages/admin/AdminDashboard'
import AdminUsers from '../pages/admin/AdminUsers'
import AdminRequests from '../pages/admin/AdminRequests'
import AdminEvents from '../pages/admin/AdminEvents'
import AdminAnnouncements from '../pages/admin/AdminAnnouncements'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/service-requests" element={<ServiceRequests />} />
          <Route path="/service-requests/:id" element={<ServiceRequestDetail />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/events" element={<Events />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/search" element={<SearchPage />} />

          <Route element={<ProtectedRoute roles={['faculty', 'admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/requests" element={<AdminRequests />} />
            <Route path="/admin/appointments" element={<Appointments manage />} />
            <Route path="/admin/reservations" element={<Reservations manage />} />
            <Route path="/admin/events" element={<AdminEvents />} />
            <Route path="/admin/announcements" element={<AdminAnnouncements />} />
          </Route>
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin/users" element={<AdminUsers />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
