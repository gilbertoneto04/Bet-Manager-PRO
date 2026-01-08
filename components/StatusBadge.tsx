import React from 'react';
import { TaskStatus } from '../types';
import { STATUS_COLORS, TASK_STATUS_LABELS } from '../constants';

export const StatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[status]}`}>
      {TASK_STATUS_LABELS[status]}
    </span>
  );
};