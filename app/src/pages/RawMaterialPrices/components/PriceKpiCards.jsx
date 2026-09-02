import React from 'react';
import { TrendingUp, Calendar, Clock } from 'lucide-react';

const PriceKpiCards = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div className="card bg-surface p-6 border-l-4 border-success shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-secondary mb-1 uppercase tracking-wider">Materials Updated</p>
            <h3 className="text-3xl font-bold text-primary">{stats.updatedToday || 0}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-success shrink-0">
            <TrendingUp size={24} />
          </div>
        </div>
        <div className="mt-4 text-xs text-secondary">
          Unique raw materials updated today
        </div>
      </div>
      
      <div className="card bg-surface p-6 border-l-4 border-primary shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-secondary mb-1 uppercase tracking-wider">Total Quotes</p>
            <h3 className="text-3xl font-bold text-primary">{stats.totalEntriesToday || 0}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
            <Calendar size={24} />
          </div>
        </div>
        <div className="mt-4 text-xs text-secondary">
          Total broker quotes entered today
        </div>
      </div>

      <div className="card bg-surface p-6 border-l-4 border-warning shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-secondary mb-1 uppercase tracking-wider">Pending Tracking</p>
            <h3 className="text-3xl font-bold text-warning">{stats.pendingToday || 0}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-warning shrink-0">
            <Clock size={24} />
          </div>
        </div>
        <div className="mt-4 text-xs text-secondary">
          Materials awaiting updates today
        </div>
      </div>
    </div>
  );
};

export default PriceKpiCards;
