import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight, RefreshCw } from 'lucide-react';
import { getDeliveryStopsForTrip } from '../lib/erpnextApi';
import type { DeliveryStop } from '../types/erpnext';
import { useCachedApi } from '../hooks/useCachedApi';

export default function TripDetails() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const { data, loading, error } = useCachedApi<DeliveryStop[]>(
    `stops_${tripId}`,
    async () => {
      const data = await getDeliveryStopsForTrip(tripId!);
      return data;
    },
    [tripId]
  );

  const stops = data || [];

  if (loading && stops.length === 0) {
    return <div className="flex justify-center p-8">Loading stops...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center p-8 text-center gap-4">
        <p className="text-red-500 font-medium">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-slate-100 rounded-lg text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="mb-2">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          Trip Stops
          {loading && <RefreshCw size={16} className="text-slate-400 animate-spin" />}
        </h2>
        <p className="text-slate-500">{tripId}</p>
      </div>

      <div className="flex flex-col gap-3">
        {stops.filter(stop => {
          const isDone = stop.status === 'Completed' || stop.status === 'Visited' || String(stop.visited) === '1';
          return !isDone;
        }).map((stop, index) => {
          const isCompleted = false; // We filtered them out, so none are completed here
          return (
            <div 
              key={stop.name}
              onClick={() => navigate(`/trips/${tripId}/stops/${stop.name}/manual`)}
              className={`rounded-2xl p-4 border transition-all active:scale-[0.98] cursor-pointer
                ${isCompleted ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 shadow-sm'}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${isCompleted ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-[var(--color-action-blue)]'}`}>
                    {index + 1}
                  </div>
                  {index < stops.length - 1 && (
                    <div className={`w-0.5 h-8 ${isCompleted ? 'bg-slate-200' : 'bg-blue-100'}`}></div>
                  )}
                </div>
                
                <div className="flex-1 pb-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-semibold ${isCompleted ? 'text-slate-500 line-through' : 'text-lg'}`}>
                      {stop.customer}
                    </h3>
                    {stop.direction === 'Return' ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-[var(--color-warning-orange)]">
                        Return
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-[var(--color-action-blue)]">
                        Deliver
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-3">
                    <MapPin size={14} /> {stop.address || 'Address missing'}
                  </p>
                  
                  <button className="flex items-center gap-1 text-sm font-medium text-[var(--color-action-blue)]">
                    Open Stop <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
