import React from 'react';
import { Store, MapPin, IndianRupee, Clock, FileText, ExternalLink } from 'lucide-react';

const BrokerQuotesTable = ({ quotes, currMin, currMax, unit, currDateStr }) => {
  const spread = currMax - currMin;

  return (
    <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-sm overflow-hidden">
      <div className="p-6 border-b border-[#E2E8F0] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold text-[#0F172A]">Today's Broker Quotes</h3>
          </div>
          <p className="text-sm text-[#64748B]">{quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'} collected on {currDateStr}</p>
        </div>
        
        {quotes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0 w-full lg:w-auto">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex flex-col justify-center min-w-[80px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Quotes</span>
              <span className="text-sm font-bold text-slate-800">{quotes.length}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex flex-col justify-center min-w-[100px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Low</span>
              <span className="text-sm font-bold text-slate-800 whitespace-nowrap">₹{currMin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex flex-col justify-center min-w-[100px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase">High</span>
              <span className="text-sm font-bold text-slate-800 whitespace-nowrap">₹{currMax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex flex-col justify-center min-w-[80px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Spread</span>
              <span className="text-sm font-bold text-slate-800 whitespace-nowrap">₹{spread.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
      </div>

      {quotes.length > 0 ? (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse hidden md:table">
            <thead className="bg-slate-50 border-b border-[#E2E8F0]">
              <tr>
                <th className="px-6 py-3.5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Broker</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Location</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Quote Time</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-[#64748B] uppercase tracking-wider text-right">Price / {unit.toLowerCase()}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {quotes.map((q, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Store size={14} />
                      </div>
                      <span className="font-semibold text-[#0F172A]">{q.brokerName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-[#64748B] text-sm font-medium whitespace-nowrap">
                      <MapPin size={14} />
                      {q.location || 'Not specified'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-400 text-sm italic whitespace-nowrap">
                      <Clock size={14} />
                      {q.quoteTime || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <span className="text-[15px] font-bold text-[#0F172A]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      ₹{Number(q.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-[#64748B] font-medium ml-1">
                      / {unit.toLowerCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="md:hidden flex flex-col divide-y divide-slate-100">
            {quotes.map((q, idx) => (
              <div key={idx} className="p-4 bg-white flex justify-between items-start gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Store size={14} className="text-blue-500 shrink-0" />
                    <span className="font-semibold text-slate-800 text-sm">{q.brokerName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    <MapPin size={12} className="shrink-0" />
                    <span className="truncate">{q.location || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs italic">
                    <Clock size={12} className="shrink-0" />
                    <span>{q.quoteTime || 'Unknown'}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-slate-800 whitespace-nowrap">₹{Number(q.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <p className="text-[10px] text-slate-400 uppercase mt-0.5 whitespace-nowrap">/ {unit.toLowerCase()}</p>
                </div>
              </div>
            ))}
          </div>

          {quotes.length === 1 && (
            <div className="bg-slate-50 p-3 text-center border-t border-[#E2E8F0]">
              <p className="text-[13px] text-[#64748B] font-medium">
                Only one broker quote is available for this date.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 border border-[#E2E8F0] flex items-center justify-center text-[#64748B] mb-4">
            <IndianRupee size={28} />
          </div>
          <h4 className="text-lg font-semibold text-[#0F172A] mb-1">No quotes available</h4>
          <p className="text-[#64748B] text-sm max-w-sm">
            No broker quotes found for this date. Add a quote to begin analysis.
          </p>
        </div>
      )}
    </div>
  );
};

export default BrokerQuotesTable;
