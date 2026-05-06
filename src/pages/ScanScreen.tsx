import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Camera, Keyboard } from 'lucide-react';

export default function ScanScreen() {
  const navigate = useNavigate();
  const [scannedItems, setScannedItems] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');

  const expectedTotal = 12;

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput && !scannedItems.includes(manualInput)) {
      setScannedItems([...scannedItems, manualInput]);
      setManualInput('');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-in fade-in zoom-in-95 duration-300">
      
      {/* Viewfinder Mock */}
      <div className="relative w-full flex-1 bg-slate-900 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center mb-4">
        {/* Mock camera view */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-700 via-slate-900 to-black"></div>
        
        {/* Scanner frame */}
        <div className="w-64 h-64 border-2 border-[var(--color-action-blue)] rounded-3xl relative z-10 flex flex-col items-center justify-center">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-3xl -m-1"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-3xl -m-1"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-3xl -m-1"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-3xl -m-1"></div>
          
          <Camera size={48} className="text-white/50 mb-4" />
          <p className="text-white/70 font-medium tracking-wide">Point at Barcode/QR</p>
        </div>

        {/* Scan line animation */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[var(--color-action-blue)] shadow-[0_0_8px_2px_rgba(89,159,245,0.8)] z-20 animate-pulse"></div>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Scanned Items</h3>
          <span className="font-mono bg-blue-50 text-[var(--color-action-blue)] px-3 py-1 rounded-full text-sm font-bold">
            {scannedItems.length} / {expectedTotal}
          </span>
        </div>

        <form onSubmit={handleManualAdd} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Keyboard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Manual entry..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-action-blue)]"
            />
          </div>
          <button type="submit" className="px-4 bg-[var(--color-primary)] text-white font-medium rounded-xl text-sm active:scale-95 transition-transform">
            Add
          </button>
        </form>

        <div className="max-h-32 overflow-y-auto space-y-2">
          {scannedItems.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-4">No items scanned yet.</p>
          ) : (
            scannedItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg text-sm font-mono border border-slate-100">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-[var(--color-success-green)]" />
                  {item}
                </div>
                <button 
                  onClick={() => setScannedItems(scannedItems.filter(i => i !== item))}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <button 
        onClick={() => navigate(-1)}
        className="w-full py-4 bg-slate-900 text-white font-semibold rounded-2xl shadow-md active:scale-[0.98] transition-all"
      >
        Done Scanning
      </button>

    </div>
  );
}
