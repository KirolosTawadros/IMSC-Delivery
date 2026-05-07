import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Menu, LogOut, Package } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isTripsPage = location.pathname === '/trips';

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('logged_user');
    localStorage.removeItem('driver_id');
    navigate('/login');
    setIsMenuOpen(false);
  };

  const handleGoToTrips = () => {
    navigate('/trips');
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-primary)] font-sans flex flex-col">
      {/* Top Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between relative" ref={menuRef}>
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
          
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            <Menu size={24} className="text-[var(--color-primary)]" />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute top-14 right-4 bg-white rounded-2xl shadow-xl border border-slate-100 w-48 overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200">
              <button 
                onClick={handleGoToTrips}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-slate-700 transition-colors border-b border-slate-50"
              >
                <Package size={18} className="text-[var(--color-action-blue)]" />
                <span className="font-medium text-sm">My Trips</span>
              </button>
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-red-50 text-red-600 transition-colors"
              >
                <LogOut size={18} />
                <span className="font-medium text-sm">Logout</span>
              </button>
            </div>
          )}
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
