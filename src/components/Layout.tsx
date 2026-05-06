import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Menu } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isTripsPage = location.pathname === '/trips';

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-primary)] font-sans flex flex-col">
      {/* Top Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {!isTripsPage && (
              <button 
                onClick={() => navigate(-1)}
                className="p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft size={24} className="text-[var(--color-primary)]" />
              </button>
            )}
            <h1 className="text-xl font-semibold tracking-tight">IMSC Delivery</h1>
          </div>
          
          <button className="p-1 rounded-full hover:bg-slate-100 transition-colors">
            <Menu size={24} className="text-[var(--color-primary)]" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col gap-4">
        <Outlet />
      </main>
      
      {/* Safe area for mobile bottom */}
      <div className="h-6" />
    </div>
  );
}
