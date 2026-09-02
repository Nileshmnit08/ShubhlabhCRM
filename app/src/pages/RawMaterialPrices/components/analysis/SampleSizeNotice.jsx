import React from 'react';
import { Info } from 'lucide-react';

const SampleSizeNotice = ({ baseCount, currCount }) => {
  if (baseCount !== 1 && currCount !== 1) return null;

  return (
    <div className="bg-[#FFFBEB] border border-[#B45309]/20 rounded-xl p-4 flex items-start gap-3 shadow-sm">
      <div className="text-[#B45309] shrink-0 mt-0.5">
        <Info size={18} />
      </div>
      <div>
        <h4 className="text-[14px] font-semibold text-[#B45309] mb-0.5">Limited market sample</h4>
        <p className="text-[13px] text-[#B45309]/90">
          This comparison is based on exactly one quote on {baseCount === 1 && currCount === 1 ? 'each date' : baseCount === 1 ? 'the previous date' : 'the current date'}. Price movements may not reflect the entire market.
        </p>
      </div>
    </div>
  );
};

export default SampleSizeNotice;
