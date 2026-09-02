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
          wrapper: { background: 'var(--bg-surface)', border: '1px solid var(--success)', borderColor: 'color-mix(in srgb, var(--success) 20%, transparent)' },
          title: { color: 'var(--text-primary)' },
          value: { color: 'var(--success)' },
          support: { color: 'color-mix(in srgb, var(--success) 80%, transparent)' },
          iconWrap: { background: 'color-mix(in srgb, var(--success) 10%, transparent)', color: 'var(--success)' }
        };
      case 'negative':
        return {
          wrapper: { background: 'var(--bg-surface)', border: '1px solid var(--danger)', borderColor: 'color-mix(in srgb, var(--danger) 20%, transparent)' },
          title: { color: 'var(--text-primary)' },
          value: { color: 'var(--danger)' },
          support: { color: 'color-mix(in srgb, var(--danger) 80%, transparent)' },
          iconWrap: { background: 'color-mix(in srgb, var(--danger) 10%, transparent)', color: 'var(--danger)' }
        };
      case 'highlight':
        return {
          wrapper: { background: 'color-mix(in srgb, var(--success) 5%, transparent)', border: '1px solid var(--success)', borderColor: 'color-mix(in srgb, var(--success) 20%, transparent)' },
          title: { color: 'var(--text-primary)' },
          value: { color: 'var(--success)' },
          support: { color: 'color-mix(in srgb, var(--success) 80%, transparent)' },
          iconWrap: { background: 'var(--bg-surface)', color: 'var(--success)', boxShadow: 'var(--shadow-sm)' }
        };
      case 'neutral':
      default:
        return {
          wrapper: { background: 'var(--bg-surface)', border: '1px solid var(--border)' },
          title: { color: 'var(--text-primary)' },
          value: { color: 'var(--text-primary)' },
          support: { color: 'var(--text-secondary)' },
          iconWrap: { background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
        };
    }
  };

  const styles = getStyles();

  return (
    <div className="rounded-[14px] p-5 flex flex-col h-full shadow-sm" style={styles.wrapper}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider" style={styles.title}>
          {title}
        </h3>
        {Icon && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={styles.iconWrap}>
            <Icon size={16} />
          </div>
        )}
      </div>
      
      <div className="mt-auto">
        <div className="text-2xl sm:text-[26px] font-bold tracking-tight mb-1.5 flex flex-wrap items-center gap-2" style={{ fontVariantNumeric: 'tabular-nums', ...styles.value }}>
          <span className="whitespace-nowrap">{value}</span>
          {badge && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider shadow-sm whitespace-nowrap mt-0.5" style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {badge}
            </span>
          )}
        </div>
        <div className="text-[13px] font-medium" style={styles.support}>
          {supportText}
        </div>
      </div>
    </div>
  );
};

export default PriceMetricCard;
