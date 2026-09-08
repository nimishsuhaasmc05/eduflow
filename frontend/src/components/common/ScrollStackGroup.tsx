import React from 'react';

interface ScrollStackGroupProps {
  children: React.ReactNode[];
  className?: string;
  topOffsetStepPx?: number;
  baseTopPx?: number;
}

export const ScrollStackGroup: React.FC<ScrollStackGroupProps> = ({
  children,
  className = '',
  topOffsetStepPx = 36,
  baseTopPx = 80
}) => {
  return (
    <div className={`story-stack-container relative pb-36 ${className}`}>
      {React.Children.map(children, (child, index) => {
        const topPx = baseTopPx + index * topOffsetStepPx;
        return (
          <div
            key={index}
            className="sticky-stack-card clubbing-card-shadow rounded-3xl overflow-hidden bg-white dark:bg-[#11171D] border border-slate-200 dark:border-[#26323A] mb-24 last:mb-0"
            style={{
              top: `${topPx}px`,
              zIndex: (index + 1) * 10
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
};
