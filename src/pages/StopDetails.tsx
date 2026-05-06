import { useNavigate, useParams } from 'react-router-dom';
import { Package, ScanBarcode, FileWarning, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { getDeliveryStopsForTrip, getOperationOrderFromStockFulfillment, getOperationOrderDetails } from '../lib/erpnextApi';
import type { DeliveryStop } from '../types/erpnext';
import { useCachedApi } from '../hooks/useCachedApi';
import { useEffect } from 'react';

export default function StopDetails() {
  const { tripId, stopId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Pending'); // Pending -> In Progress -> Completed

  const { data: stops, loading } = useCachedApi<DeliveryStop[]>(
    `stops_${tripId}`,
    () => getDeliveryStopsForTrip(tripId!),
    [tripId]
  );

  const stop = stops?.find((s: DeliveryStop) => s.name === stopId) || null;
  const fulfillmentId = stop?.documents || stop?.stock_fulfillment || stop?.fulfillment_doc;

  // Background Prefetch for Operation Order (to make Manual Entry instant)
  useEffect(() => {
    if (fulfillmentId) {
      getOperationOrderFromStockFulfillment(fulfillmentId)
        .then(opOrderId => {
          if (opOrderId) {
            getOperationOrderDetails(opOrderId).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [fulfillmentId]);

  const handleStartStop = () => {
    setStatus('In Progress');
    // Here we'd call API to update stop status
  };

  if (loading && !stop) return <div className="p-8 text-center">Loading details...</div>;
  if (!loading && !stop) return <div className="p-8 text-center text-red-500">Stop not found</div>;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      
      {/* Header Info */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full blur-2xl opacity-60"></div>
        
        <span className="inline-block px-3 py-1 bg-blue-50 text-[var(--color-action-blue)] text-xs font-bold uppercase tracking-wider rounded-full mb-3">
          {stop?.direction}
        </span>
        <h2 className="text-2xl font-bold mb-1 flex items-center justify-between">
          {stop?.customer}
          {loading && <RefreshCw size={16} className="text-slate-400 animate-spin" />}
        </h2>
        <p className="text-slate-500 text-sm mb-4">{stop?.address || 'Address not available'}</p>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Stop ID</p>
            <p className="font-medium text-xs break-all">{stopId}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Documents</p>
            <p className="font-medium text-sm">{stop?.documents || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {status === 'Pending' && (
          <button 
            onClick={handleStartStop}
            className="w-full py-4 bg-[var(--color-primary)] text-white font-semibold rounded-2xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Start Stop <ArrowRight size={18} />
          </button>
        )}

        {status === 'In Progress' && (
          <>
            <button 
              onClick={() => navigate(`/trips/${tripId}/stops/${stopId}/manual`, { state: { stop } })}
              className="w-full py-4 bg-[var(--color-action-blue)] text-white font-semibold rounded-2xl shadow-md shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Package size={20} /> Manual Entry
            </button>
            
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button 
                onClick={() => navigate(`/trips/${tripId}/stops/${stopId}/scan`)}
                className="py-3 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl active:bg-slate-50 transition-all flex flex-col items-center gap-1"
              >
                <ScanBarcode size={20} className="text-slate-400" />
                <span className="text-sm">Scan Items</span>
              </button>
              <button className="py-3 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl active:bg-slate-50 transition-all flex flex-col items-center gap-1">
                <FileWarning size={20} className="text-[var(--color-warning-orange)]" />
                <span className="text-sm">Report Issue</span>
              </button>
            </div>

            <button 
              onClick={() => navigate(`/trips/${tripId}/stops/${stopId}/complete`, { state: { stop } })}
              className="mt-6 w-full py-4 bg-[var(--color-success-green)] text-white font-semibold rounded-2xl shadow-md shadow-green-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={20} /> Complete Stop
            </button>
          </>
        )}
      </div>

    </div>
  );
}
