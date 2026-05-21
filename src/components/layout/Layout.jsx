// src/components/layout/Layout.jsx

import { useState } from 'react';
import { Menu, X, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BANK_NAME, THEME } from '../../config/constants';
import { useNotifications } from '../../context/NotificationContext';

export const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Desktop sidebar (always visible ≥ lg) ── */}
      <aside className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex flex-col">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 h-14 flex items-center gap-4 flex-shrink-0">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <h1 className={`text-sm font-semibold ${THEME.primaryText} hidden sm:block`}>
            {BANK_NAME}
          </h1>

          <div className="ml-auto flex items-center gap-2">
            <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
