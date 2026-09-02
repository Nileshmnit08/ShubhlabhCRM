import React from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RawMaterialPriceHeader = () => {
  const navigate = useNavigate();

  return (
    <div className="page-header">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary mb-1">Raw Material Prices</h1>
        <p className="text-sm text-secondary">Track and analyze daily cattle-feed material prices</p>
      </div>
      <div className="flex items-center gap-3 mt-4 sm:mt-0">
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/raw-material-prices/daily-entry')}
        >
          <Plus size={18} />
          Add Daily Price
        </button>
      </div>
    </div>
  );
};

export default RawMaterialPriceHeader;
