import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="bg-skin-card border border-skin-border rounded-2xl overflow-hidden flex flex-col h-full animate-pulse shadow-sm">
      <div className="aspect-[3/4] w-full bg-skin-control-bg"></div>
      <div className="p-5 flex flex-col flex-grow space-y-3">
        <div className="h-4 bg-skin-control-bg rounded w-1/3"></div>
        <div className="h-6 bg-skin-control-bg rounded w-3/4"></div>
        <div className="space-y-2 flex-grow mt-2">
          <div className="h-3 bg-skin-control-bg/60 rounded w-full"></div>
          <div className="h-3 bg-skin-control-bg/60 rounded w-5/6"></div>
        </div>
        <div className="flex justify-between items-center pt-4 mt-auto">
           <div className="h-3 bg-skin-control-bg rounded w-1/4"></div>
           <div className="h-8 bg-skin-control-bg rounded w-8 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;