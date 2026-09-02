import React from 'react';

const EmptyState = ({ icon: Icon, title, description, actionText, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-base/10 border-b-0 min-h-[250px]">
      <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-secondary mb-4 border border-base">
        <Icon size={32} className="text-muted/60" />
      </div>
      <h4 className="font-semibold text-primary mb-1 text-lg">{title}</h4>
      <p className="text-sm text-secondary mb-5 max-w-sm">{description}</p>
      {actionText && (
        <button className="btn btn-primary btn-sm px-5 rounded-full" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
