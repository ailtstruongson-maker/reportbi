import React, { forwardRef } from 'react';

// Fix: Changed title prop from `string` to `React.ReactNode` to allow complex JSX elements.
interface CardProps {
  title: React.ReactNode;
  actionButton?: React.ReactNode;
  children: React.ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(({ title, actionButton, children }, ref) => {
  return (
    <div ref={ref} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 sm:p-8 transition-shadow duration-300 hover:shadow-xl dark:border dark:border-slate-700">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700">
        {/* Fix: Changed from h2 to div to maintain semantic correctness when the title is a complex JSX element. */}
        <div className="text-xl font-semibold text-slate-700 dark:text-slate-200">{title}</div>
        {actionButton && <div>{actionButton}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
});

export default Card;
