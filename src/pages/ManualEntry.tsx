import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getDeliveryStopsForTrip, getOperationOrderFromStockFulfillment, getOperationOrderDetails, getDocument } from '../lib/erpnextApi';
import { Check, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import type { DeliveryStop } from '../types/erpnext';

export default function ManualEntry() {
  const { tripId, stopId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [stop, setStop] = useState<DeliveryStop | null>(location.state?.stop || null);
  const [cases, setCases] = useState<any[]>([]);
  const [opOrder, setOpOrder] = useState<any>(null);
  const [fulfillment, setFulfillment] = useState<any>(null);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [checkedCases, setCheckedCases] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Get Stop Details (use passed state if available, else fetch)
        let currentStop = stop;
        if (!currentStop) {
          const stops = await getDeliveryStopsForTrip(tripId!);
          currentStop = stops.find((s: DeliveryStop) => s.name === stopId) || null;
          if (!currentStop) throw new Error('Stop not found');
          setStop(currentStop as DeliveryStop);
        }

        const fulfillmentId = currentStop.documents || currentStop.stock_fulfillment || currentStop.fulfillment_doc;
        if (!fulfillmentId) throw new Error('No Stock Fulfillment linked to this stop.');

        // SWR: Check local cache first for instant loading
        const cacheKey = `manual_entry_${fulfillmentId}`;
        const cachedData = localStorage.getItem(cacheKey);
        let hasCache = false;
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            setFulfillment(parsed.fulfillment);
            setOpOrder(parsed.opOrder);
            setCases(parsed.cases);
            
            // Auto-check items that are already marked in backend
            const alreadyChecked = new Set<string>();
            parsed.cases.forEach((req: any) => {
              if (currentStop!.direction === 'Deliver' && req.is_delivered) alreadyChecked.add(req.name);
              if (currentStop!.direction === 'Return' && req.is_collected) alreadyChecked.add(req.name);
            });
            setCheckedCases(alreadyChecked);
            hasCache = true;
            setLoading(false); // Instantly remove loading screen
          } catch (e) {
            // ignore cache parse errors
          }
        }

        if (!hasCache) {
          setLoading(true);
        }

        const fulfillmentIds = fulfillmentId.split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean);
        if (fulfillmentIds.length === 0) throw new Error('No valid Stock Fulfillment linked to this stop.');

        // 1.5 Get Stock Fulfillment Docs & 2. Get Operation Order IDs concurrently
        const [fulfillmentDocs, opOrderIds] = await Promise.all([
          Promise.all(fulfillmentIds.map((id: string) => getDocument('Stock Fulfillment', id).catch(() => null))),
          Promise.all(fulfillmentIds.map((id: string) => getOperationOrderFromStockFulfillment(id)))
        ]);
        
        let allShortCodes: any[] = [];
        fulfillmentDocs.forEach((doc: any) => {
          if (doc && doc.short_codes) allShortCodes.push(...doc.short_codes);
        });
        const newFulfillment = { short_codes: allShortCodes };
        setFulfillment(newFulfillment);

        const uniqueOpOrderIds = [...new Set(opOrderIds.filter(Boolean))];
        if (uniqueOpOrderIds.length === 0) throw new Error('Could not find Operation Order for this Fulfillment.');

        // 3. Get Operation Order Details
        const opOrders = await Promise.all(
          uniqueOpOrderIds.map(id => getOperationOrderDetails(id as string))
        );
        
        let allRequirements: any[] = [];
        opOrders.forEach(op => {
          if (op && op.requirements) allRequirements.push(...op.requirements);
        });

        if (allRequirements.length > 0) {
          setOpOrder(opOrders[0]);
          setCases(allRequirements);
          
          // Auto-check items that are already marked in backend
          const alreadyChecked = new Set<string>();
          allRequirements.forEach((req: any) => {
            if (currentStop!.direction === 'Deliver' && req.is_delivered) alreadyChecked.add(req.name);
            if (currentStop!.direction === 'Return' && req.is_collected) alreadyChecked.add(req.name);
          });
          setCheckedCases(alreadyChecked);

          // Save to persistent cache
          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              fulfillment: newFulfillment,
              opOrder: opOrders[0],
              cases: allRequirements
            }));
          } catch (e) {
            // Ignore quota errors
          }
        }
      } catch (err: any) {
        // Only show error if we don't have cached data to show
        if (cases.length === 0) {
          setError(err.message || 'Failed to load case types');
        } else {
          console.warn('Background fetch failed, using cached cases', err);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tripId, stopId]);

  const toggleCase = (caseId: string) => {
    const newChecked = new Set(checkedCases);
    if (newChecked.has(caseId)) newChecked.delete(caseId);
    else newChecked.add(caseId);
    setCheckedCases(newChecked);
  };

  const handleSave = async () => {
    // Navigate to completion screen, passing along the selected cases
    navigate(`/trips/${tripId}/stops/${stopId}/complete`, { 
      replace: true,
      state: { 
        checkedCases: Array.from(checkedCases),
        cases: cases,
        stop,
        opOrder
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)] items-center justify-center p-8 animate-in fade-in duration-300">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-[var(--color-action-blue)] rounded-full animate-spin mb-4"></div>
        <h3 className="text-lg font-bold text-slate-700">Loading Cases</h3>
        <p className="text-sm text-slate-400 text-center mt-2 max-w-[200px]">
          Syncing stock and fulfillment requirements from the server...
        </p>
      </div>
    );
  }
  if (error) return (
    <div className="p-8 text-center text-red-500 flex flex-col gap-4">
      {error}
      <button onClick={() => navigate(-1)} className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700">Go Back</button>
    </div>
  );

  const isDeliver = stop?.direction === 'Deliver';

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-4 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <ClipboardList size={20} className="text-[var(--color-action-blue)]" />
            Case Types
          </h3>
          <span className="font-mono bg-blue-50 text-[var(--color-action-blue)] px-3 py-1 rounded-full text-sm font-bold">
            {checkedCases.size} / {cases.length}
          </span>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Check the cases you have {isDeliver ? 'delivered' : 'collected'}.
        </p>

        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => setCheckedCases(new Set(cases.map(c => c.name)))}
            className="flex-1 py-2 bg-blue-50 text-[var(--color-action-blue)] font-semibold rounded-xl text-sm border border-blue-100 active:bg-blue-100 transition-colors"
          >
            All Done
          </button>
          <button 
            onClick={() => setCheckedCases(new Set())}
            className="flex-1 py-2 bg-slate-50 text-slate-600 font-semibold rounded-xl text-sm border border-slate-200 active:bg-slate-100 transition-colors"
          >
            All Not Done
          </button>
        </div>

        <div className="space-y-3">
          {cases.map((c) => {
            const isChecked = checkedCases.has(c.name);
            const isExpanded = expandedCase === c.name;
            
            // Find short codes linked to this case type
            // It could be linked by case_type (string) or by reference (c.name). We'll check both.
            const relatedShortCodes = fulfillment?.short_codes?.filter((sc: any) => 
              sc.case_type === c.case_type || sc.case_type === c.name || sc.reference === c.name
            ) || [];

            return (
              <div key={c.name} className="flex flex-col border rounded-2xl overflow-hidden shadow-sm transition-all border-slate-100">
                <div 
                  onClick={() => toggleCase(c.name)}
                  className={`flex items-start gap-3 p-4 transition-all cursor-pointer active:scale-[0.98]
                    ${isChecked ? 'bg-blue-50 border-b-blue-100' : 'bg-slate-50 border-b-slate-100'}
                    ${isExpanded ? 'border-b' : ''}`}
                >
                  <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${isChecked ? 'bg-[var(--color-action-blue)] border-[var(--color-action-blue)]' : 'border-slate-300'}`}
                  >
                    {isChecked && <Check size={14} className="text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className={`font-semibold text-sm ${isChecked ? 'text-[var(--color-action-blue)]' : 'text-slate-700'}`}>
                        {c.case_type || 'Unknown Case'}
                      </h4>
                      {relatedShortCodes.length > 0 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setExpandedCase(isExpanded ? null : c.name); }}
                          className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}
                    </div>
                    {c.case_group && (
                      <p className="text-xs text-slate-500 mt-1">{c.case_group}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-medium bg-white px-2 py-1 rounded-md inline-block border border-slate-100 shadow-sm">
                        Qty: {c.case_count}
                      </span>
                      {relatedShortCodes.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">
                          {relatedShortCodes.length} Items Included
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && relatedShortCodes.length > 0 && (
                  <div className="bg-white p-3">
                    <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Prepared Items / Sizes</p>
                    <ul className="space-y-2">
                      {relatedShortCodes.map((sc: any, idx: number) => (
                        <li key={idx} className="flex justify-between items-start text-sm p-3 rounded-lg bg-slate-50 border border-slate-100">
                          <div className="flex flex-col pr-2">
                            <span className="text-slate-800 font-semibold">
                              {sc.template || 'Unknown Template'} 
                              {sc.attr_val && <span className="text-slate-500 font-normal ml-1">({sc.attr_val})</span>}
                            </span>
                            {sc.codes && (
                              <span 
                                className="text-slate-500 text-xs mt-1.5 font-mono bg-white px-2 py-0.5 rounded border border-slate-100 inline-block w-fit"
                                dangerouslySetInnerHTML={{ __html: sc.codes }}
                              />
                            )}
                          </div>
                          <span className="text-[var(--color-action-blue)] font-bold text-xs bg-blue-50 px-2 py-1 rounded-md mt-0.5 flex-shrink-0 shadow-sm border border-blue-100">
                            x{sc.count || sc.qty || 1}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button 
        onClick={handleSave}
        className="w-full py-4 bg-slate-900 text-white font-semibold rounded-2xl shadow-md active:scale-[0.98] transition-all"
      >
        Confirm {isDeliver ? 'Delivery' : 'Collection'}
      </button>
    </div>
  );
}
