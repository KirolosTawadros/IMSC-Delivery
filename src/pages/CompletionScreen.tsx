import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Camera, PenTool, CheckCircle2 } from 'lucide-react';
import { submitDeliveryForm, updateDocument, clearApiCache } from '../lib/erpnextApi';
import type { DeliveryStop } from '../types/erpnext';
import { useCachedApi } from '../hooks/useCachedApi';
import { getDeliveryStopsForTrip, getDeliveryTripDetails } from '../lib/erpnextApi';

export default function CompletionScreen() {
  const { tripId, stopId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [receiverName, setReceiverName] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdFormName, setCreatedFormName] = useState<string | null>(null);

  // Get stop from navigation state, or fallback to cache
  const passedStop = location.state?.stop;
  const checkedCases = location.state?.checkedCases || [];
  const cases = location.state?.cases || [];
  const opOrder = location.state?.opOrder || {};
  
  const { data: stops } = useCachedApi<DeliveryStop[]>(
    `stops_${tripId}`,
    () => getDeliveryStopsForTrip(tripId!),
    [tripId]
  );

  // Fetch trip details from cache (already loaded by stops fetch) to get delivery_agent
  const { data: tripDetails } = useCachedApi<any>(
    `tripDetails_${tripId}`,
    () => getDeliveryTripDetails(tripId!),
    [tripId]
  );

  const stop = passedStop || stops?.find((s) => s.name === stopId);
  let rawFulfillmentId = stop?.documents || stop?.stock_fulfillment || '';
  if (rawFulfillmentId === 'None') rawFulfillmentId = '';
  // The backend Link field can only hold ONE name, so we take the first valid ID
  const fulfillmentId = rawFulfillmentId.split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean)[0] || '';

  const [lastPayload, setLastPayload] = useState<any>(null);

  const handleCreateDraft = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    
    // Extract delivery agent from trip (or fallback to delivered_by/driver)
    const tripAgent = tripDetails?.delivery_agent || tripDetails?.delivered_by || tripDetails?.driver || '';

    const payload = {
      delivery_trip: tripId!,
      hospital: stop?.customer || 'Unknown Hospital',
      fulfillment_doc: fulfillmentId,
      direction: stop?.direction || 'Deliver',
      user_id: localStorage.getItem('logged_user') || '',
      delivery_agent: tripAgent,
      status: 'Completed',
      performed_by: receiverName,
      notes: notes,
      // NO docstatus here, so it saves as Draft!
      details: cases.map((req: any) => ({
        done: checkedCases.includes(req.name) ? 1 : 0,
        direction: stop?.direction || 'Deliver',
        fulfillment_doc: fulfillmentId,
        case_type: req.case_type,
        reference: req.name,
        doctor: opOrder?.doctor || req.doctor || 'Unknown Doctor',
        operation_time: opOrder?.operation_time || req.operation_time || new Date().toISOString().slice(0, 19).replace('T', ' ')
      }))
    };
    
    setLastPayload(payload);

    try {
      // API call to create Delivery Form as Draft
      const created = await submitDeliveryForm(payload);
      setCreatedFormName(created.name || null);
      setSubmitting(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to create Delivery Form Draft');
      setSubmitting(false);
    }
  };

  const handleSubmitDocument = async () => {
    if (!createdFormName || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      // Submit the document by setting docstatus to 1
      await updateDocument('Delivery Form', createdFormName, { docstatus: 1 });
      
      // Clear caches so the stop disappears from the trip details
      clearApiCache();
      localStorage.removeItem(`imsc_cache_stops_${tripId}`);
      localStorage.removeItem(`imsc_cache_tripDetails_${tripId}`);


      
      // Navigate back to trips or trip details
      navigate(`/trips/${tripId}`, { replace: true });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to submit the document.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
      
      <div className="bg-[var(--color-primary)] text-white p-6 rounded-3xl shadow-md text-center">
        <CheckCircle2 size={48} className="mx-auto mb-3 text-[var(--color-success-green)]" />
        <h2 className="text-2xl font-bold tracking-tight mb-1">Ready to Complete</h2>
        <p className="text-white/80 text-sm">Please confirm handover details.</p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 text-sm flex flex-col gap-2">
          <strong>Submission Error:</strong>
          <span className="break-all">{errorMsg}</span>
          {lastPayload && (
            <div className="mt-2 p-2 bg-white rounded border border-red-200 overflow-x-auto">
              <p className="font-bold text-xs mb-1 text-slate-500">Payload Sent:</p>
              <pre className="text-[10px] text-slate-700">{JSON.stringify(lastPayload, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        
        {/* Summary */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Hospital</span>
            <span className="font-medium text-slate-900 text-right max-w-[60%]">{stop?.customer || 'Loading...'}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Processed Cases</span>
            <span className="font-bold text-[var(--color-success-green)]">{checkedCases.length > 0 ? checkedCases.length : 'All Checked'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Direction</span>
            <span className={`font-medium px-2 py-0.5 rounded-md ${
              stop?.direction === 'Return' 
                ? 'text-[var(--color-warning-orange)] bg-orange-50' 
                : 'text-[var(--color-action-blue)] bg-blue-50'
            }`}>
              {stop?.direction || 'Deliver'}
            </span>
          </div>
        </div>

        {/* Capture Elements */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Receiver Name (Optional)</label>
          <input 
            type="text" 
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-action-blue)] transition-all"
            placeholder="e.g. Dr. Ahmed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
          <textarea 
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-action-blue)] transition-all resize-none"
            placeholder="Add any delivery notes..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button className="py-4 bg-slate-50 border-2 border-dashed border-slate-200 text-slate-500 font-medium rounded-2xl active:bg-slate-100 transition-all flex flex-col items-center gap-2">
            <Camera size={24} className="text-[var(--color-action-blue)]" />
            <span className="text-sm">Capture Photo</span>
          </button>
          <button className="py-4 bg-slate-50 border-2 border-dashed border-slate-200 text-slate-500 font-medium rounded-2xl active:bg-slate-100 transition-all flex flex-col items-center gap-2">
            <PenTool size={24} className="text-[var(--color-primary)]" />
            <span className="text-sm">Sign Document</span>
          </button>
        </div>

      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 max-w-md mx-auto z-50">
        {!createdFormName ? (
          <button 
            onClick={handleCreateDraft}
            disabled={submitting}
            className="w-full py-4 bg-[var(--color-primary)] text-white font-bold rounded-2xl shadow-lg shadow-blue-200/50 active:scale-[0.98] transition-all disabled:opacity-70 flex justify-center items-center gap-2 text-lg"
          >
            {submitting ? (
              <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>Create Draft</>
            )}
          </button>
        ) : (
          <button 
            onClick={handleSubmitDocument}
            disabled={submitting}
            className="w-full py-4 bg-[var(--color-success-green)] text-white font-bold rounded-2xl shadow-lg shadow-green-200/50 active:scale-[0.98] transition-all disabled:opacity-70 flex justify-center items-center gap-2 text-lg"
          >
            {submitting ? (
              <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <><CheckCircle2 size={24} /> Submit Final Form</>
            )}
          </button>
        )}
      </div>

    </div>
  );
}
