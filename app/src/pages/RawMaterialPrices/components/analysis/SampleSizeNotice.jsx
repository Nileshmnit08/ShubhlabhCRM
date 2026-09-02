import React from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const SampleSizeNotice = ({ baseCount, currCount }) => {
  if (baseCount !== 1 && currCount !== 1) return null;

  return (
    <div className="bg-[#FFFBEB] border border-[#B45309]/20 rounded-xl py-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm w-full">
      <div className="flex items-start sm:items-center gap-3 text-slate-700">
        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-[13px] leading-snug">
          <strong className="font-semibold text-amber-800 block sm:inline mb-0.5 sm:mb-0 sm:mr-2">Limited market sample:</strong>
          This comparison uses limited broker quotes. Treat the movement as indicative, not a full-market benchmark.
        </p>
      </div>
      <Link 
        to="/raw-material-prices/daily-entry" 
        className="text-[13px] font-semibold text-primary hover:text-primary-dark flex items-center gap-1 shrink-0 whitespace-nowrap bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
      >
        <Plus size={14} /> Add another broker quote
      </Link>
    </div>
  );
};

export default SampleSizeNotice;
