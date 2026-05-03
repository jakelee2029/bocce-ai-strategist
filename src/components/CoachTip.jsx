import React from 'react';
import { Lightbulb } from 'lucide-react';

/**
 * Coach's Tip — AI advice panel displayed after Monte Carlo analysis.
 *
 * @param {{ tips: string[] }} props
 */
export default function CoachTip({ tips }) {
  if (!tips || tips.length === 0) return null;

  return (
    <div className="coach-tip">
      <div className="coach-tip-header">
        <Lightbulb size={20} />
        <span>Coach's Tip</span>
      </div>
      <div className="coach-tip-body">
        {tips.map((tip, i) => (
          <p key={i} className="coach-tip-line">
            {tip}
          </p>
        ))}
      </div>
    </div>
  );
}
