import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { login, getLoggedUser, getEmployeeDetails } from '../lib/erpnextApi';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [usr, setUsr] = useState('');
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await login(usr, pwd);
      // Optimistic path: Assume `usr` is the email (which is true 99% of the time)
      let actualUserId = usr;
      let employeeDetails = await getEmployeeDetails(actualUserId);

      // Fallback: If `usr` was a username (e.g. "admin"), getEmployeeDetails will return null.
      // In that case, we fetch the canonical email from session and try again.
      if (!employeeDetails) {
        const user = await getLoggedUser();
        if (user?.message && user.message !== usr) {
          actualUserId = user.message;
          employeeDetails = await getEmployeeDetails(actualUserId);
        }
      }

      localStorage.setItem('logged_user', actualUserId);
      
      if (employeeDetails?.company) {
        localStorage.setItem('user_company', employeeDetails.company);
      }

      if (employeeDetails?.name) {
        localStorage.setItem('driver_id', employeeDetails.name);
      } else {
        // Clear it just in case they log in with a user who isn't a driver
        localStorage.removeItem('driver_id');
      }
      
      navigate('/trips');
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center p-4 font-sans text-[var(--color-primary)]">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        
        <div className="p-8 text-center bg-gradient-to-br from-[var(--color-primary)] to-[#3A4B6B] text-white">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Truck size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">IMSC Delivery</h1>
          <p className="text-white/80 text-sm mt-1">Mobile Execution Layer</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 text-center">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email or Username</label>
              <input 
                type="text" 
                required
                value={usr}
                onChange={(e) => setUsr(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-action-blue)] transition-all"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                type="password" 
                required
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-action-blue)] transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[var(--color-action-blue)] hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors active:scale-[0.98] disabled:opacity-70 flex items-center justify-center"
          >
            {loading ? (
              <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
