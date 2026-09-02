import React from 'react';
import { Plus } from 'lucide-react';

const MasterDataSectionHeader = ({ title, description, buttonText, onAdd }) => {
  return (
    <div className="p-5 border-b border-base bg-white rounded-t-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h3 className="font-semibold text-lg text-primary">{title}</h3>
        {description && <p className="text-sm text-secondary mt-1">{description}</p>}
      </div>
      {buttonText && (
        <button 
          className="btn btn-primary btn-sm flex items-center gap-2 px-4 whitespace-nowrap w-full sm:w-auto justify-center"
          onClick={onAdd}
        >
          <Plus size={16} /> {buttonText}
        </button>
      )}
    </div>
  );
};

export default MasterDataSectionHeader;
