import React from 'react';

const PriceMetricCard = ({ 
  title, 
  value, 
  supportText, 
  variant = 'neutral',
  icon: Icon,
  badge
}) => {
  
  const getStyles = () => {
    switch (variant) {
      case 'positive':
        return {
          wrapper: 'bg-white border-[#15803D]/20 border',
          title: 'text-[#0F172A]',
          value: 'text-[#15803D]',
          support: 'text-[#15803D]/80',
          iconWrap: 'bg-[#F0FDF4] text-[#15803D]'
        };
      case 'negative':
        return {
          wrapper: 'bg-white border-red-500/20 border',
          title: 'text-[#0F172A]',
          value: 'text-red-600',
          support: 'text-red-600/80',
          iconWrap: 'bg-red-50 text-red-600'
        };
      case 'highlight':
        return {
          wrapper: 'bg-[#F0FDF4] border-[#15803D]/20 border',
          title: 'text-[#0F172A]',
          value: 'text-[#15803D]',
          support: 'text-[#15803D]/80',
          iconWrap: 'bg-white text-[#15803D] shadow-sm'
        };
      case 'neutral':
      default:
        return {
          wrapper: 'bg-white border-[#E2E8F0] border',
          title: 'text-[#0F172A]',
          value: 'text-[#0F172A]',
          support: 'text-[#64748B]',
          iconWrap: 'bg-slate-50 border border-[#E2E8F0] text-[#64748B]'
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`rounded-[14px] p-5 flex flex-col h-full shadow-sm ${styles.wrapper}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-[13px] font-semibold uppercase tracking-wider ${styles.title}`}>
          {title}
        </h3>
        {Icon && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${styles.iconWrap}`}>
            <Icon size={16} />
          </div>
        )}
      </div>
      
      <div className="mt-auto">
        <div className={`text-2xl sm:text-[26px] font-bold tracking-tight mb-1.5 flex items-center gap-2 ${styles.value}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {value}
          {badge && (
            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider border border-slate-200 shadow-sm align-middle mt-1">
              {badge}
            </span>
          )}
        </div>
        <div className={`text-[13px] font-medium ${styles.support}`}>
          {supportText}
        </div>
      </div>
    </div>
  );
};

export default PriceMetricCard;
