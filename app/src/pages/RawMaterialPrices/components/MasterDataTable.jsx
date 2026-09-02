import React from 'react';

const MasterDataTable = ({ children }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm mobile-cards-table">
        {children}
      </table>
    </div>
  );
};

export default MasterDataTable;
