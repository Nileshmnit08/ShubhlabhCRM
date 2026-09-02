import React from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const SampleSizeNotice = ({ baseCount, currCount }) => {
  if (baseCount !== 1 && currCount !== 1) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm inline-flex w-full">
      <div className="flex items-center gap-2 text-slate-600">
        <AlertTriangle size={16} className="text-amber-500 shrink-0" />
        <p className="text-[13px] font-medium">
          <strong className="text-slate-700 font-semibold mr-1">Limited market sample:</strong>
          This comparison uses limited broker quotes. Treat the movement as indicative, not a full-market benchmark.
        </p>
      </div>
      <Link 
        to="/raw-material-prices/daily-entry" 
        className="text-[13px] font-semibold text-primary hover:text-primary-dark flex items-center gap-1 shrink-0 whitespace-nowrap bg-white px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
      >
        <Plus size={14} /> Add another broker quote
      </Link>
    </div>
  );
};

export default SampleSizeNotice;
