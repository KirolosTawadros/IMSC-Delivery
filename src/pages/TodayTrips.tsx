import { useNavigate } from 'react-router-dom';
import { Package, Clock, MapPin, ChevronRight, RefreshCw } from 'lucide-react';
import { getMyDeliveryTrips } from '../lib/erpnextApi';
import type { DeliveryTrip } from '../types/erpnext';
import { useCachedApi } from '../hooks/useCachedApi';
import { useEffect } from 'react';
import OneSignal from 'react-onesignal';

export default function TodayTrips() {
  const navigate = useNavigate();
  const driverId = localStorage.getItem('driver_id') || '';
  
  const { data, loading } = useCachedApi<DeliveryTrip[]>(
    `trips_${driverId}`,
    () => getMyDeliveryTrips(driverId),
    [driverId]
  );

  // Link driver ID to OneSignal so we can send push notifications directly to them
  useEffect(() => {
    if (driverId) {
      OneSignal.login(driverId).catch(e => console.error("OneSignal login error", e));
    }
  }, [driverId]);

  const trips = data || [];

  if (loading && trips.length === 0) {
    return <div className="flex items-center justify-center p-8">Loading trips...</div>;
  }

  if (trips.length === 0) {
    return (
      <div className="text-center p-8 bg-white rounded-2xl shadow-sm mt-8 border border-slate-100">
        <Package size={48} className="mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-2">No trips assigned</h2>
        <p className="text-slate-500">You don't have any delivery trips scheduled for today.</p>
      </div>
    );
  }

  const handleClearCache = () => {
    // Clear only API cache keys to keep user logged in
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    }
    // Refresh the page
    window.location.reload();
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-2">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          Today's Trips
          {loading && <RefreshCw size={16} className="text-slate-400 animate-spin" />}
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleClearCache}
            className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 active:scale-95 transition-transform border border-slate-200"
          >
            <RefreshCw size={12} />
            Clear Cache
          </button>
          <span className="bg-[var(--color-primary)] text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[var(--color-primary)]">
            {trips.length} Active
          </span>
        </div>
      </div>

      {trips.map((trip) => (
        <div 
          key={trip.name}
          onClick={() => navigate(`/trips/${trip.name}`)}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden"
        >
          {/* Status Ribbon */}
          <div className="absolute top-0 right-0">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl
              ${trip.status === 'Scheduled' ? 'bg-amber-100 text-amber-700' : 
                trip.status === 'Completed' ? 'bg-[var(--color-success-green)] text-white' : 
                'bg-[var(--color-action-blue)] text-white'}`}>
              {trip.status}
            </span>
          </div>

          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">{trip.name}</h3>
              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                <MapPin size={14} /> {trip.company || 'Main Branch'}
              </p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Package size={16} />
                <span className="font-medium">{trip.completed_stops || 0}/{trip.total_stops || 0} Stops</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock size={16} />
                <span>{trip.departure_time ? new Date(trip.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Anytime'}</span>
              </div>
            </div>
            
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[var(--color-action-blue)]">
              <ChevronRight size={20} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
