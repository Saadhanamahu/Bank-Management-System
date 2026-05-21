import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout }         from './components/layout/Layout';
import { ProtectedRoute, StaffRoute, AdminRoute } from './components/shared/ProtectedRoute';

import { Login }              from './pages/auth/Login';
import { Register }           from './pages/auth/Register';
import { Dashboard }          from './pages/Dashboard';
import { KYCUpload }          from './pages/kyc/KYCUpload';
import { SendMoney }          from './pages/transfer/SendMoney';
import { TransactionHistory } from './pages/transactions/TransactionHistory';
import { Accounts }           from './pages/accounts/Accounts';
import { CreateAccount }      from './pages/accounts/CreateAccount';
import { AccountDetails }     from './pages/accounts/AccountDetails';
import { Notifications }      from './pages/notifications/Notifications';
import { AdminDashboard }     from './pages/admin/AdminDashboard';
import { Loans }              from './pages/loans/Loans';

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard"     element={<Dashboard />} />
                <Route path="kyc"           element={<KYCUpload />} />
                <Route path="send-money"    element={<SendMoney />} />
                <Route path="transactions"  element={<TransactionHistory />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="loans"         element={<Loans />} />
                <Route path="accounts"     element={<StaffRoute><Accounts /></StaffRoute>} />
                <Route path="accounts/new" element={<StaffRoute><CreateAccount /></StaffRoute>} />
                <Route path="accounts/:id" element={<StaffRoute><AccountDetails /></StaffRoute>} />
                <Route path="admin"        element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="*"            element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}