import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import AdminRoute from './components/AdminRoute'
import Profile from './pages/Profile'
import MyBookingsPage from './pages/MyBookings'
import ReportIssue from './pages/ReportIssue'
import ForgotPassword from './pages/auth/ForgotPassword'
import UpdatePassword from './pages/auth/UpdatePassword'
import { Toaster } from './components/ui/toaster'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/update-password" element={<UpdatePassword />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/my-bookings" element={<MyBookingsPage />} />
                    <Route path="/report-issue" element={<ReportIssue />} />
                    <Route element={<AdminRoute />}>
                        <Route path="/admin" element={<AdminDashboard />} />
                    </Route>
                </Routes>
                <Toaster />
            </Router>
        </QueryClientProvider>
    )
}

export default App
