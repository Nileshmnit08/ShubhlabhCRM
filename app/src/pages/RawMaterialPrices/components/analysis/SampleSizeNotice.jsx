import React from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const SampleSizeNotice = ({ baseCount, currCount }) => {
  if (baseCount !== 1 && currCount !== 1) return null;

  return (
    <div className="rounded-xl py-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm w-full" style={{ background: 'color-mix(in srgb, var(--warning) 10%, var(--bg-surface))', border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)' }}>
      <div className="flex items-start sm:items-center gap-3" style={{ color: 'var(--text-primary)' }}>
        <AlertTriangle size={18} className="shrink-0 mt-0.5 sm:mt-0" style={{ color: 'var(--warning)' }} />
        <p className="text-[13px] leading-snug">
          <strong className="font-semibold block sm:inline mb-0.5 sm:mb-0 sm:mr-2" style={{ color: 'color-mix(in srgb, var(--warning) 80%, black)' }}>Limited market sample:</strong>
          <span style={{ color: 'var(--text-secondary)' }}>This comparison uses limited broker quotes. Treat the movement as indicative, not a full-market benchmark.</span>
        </p>
      </div>
      <Link 
        to="/raw-material-prices/daily-entry" 
        className="text-[13px] font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg transition-colors shadow-sm"
        style={{ color: 'var(--primary)', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <Plus size={14} /> Add another broker quote
      </Link>
    </div>
  );
};

export default SampleSizeNotice;
