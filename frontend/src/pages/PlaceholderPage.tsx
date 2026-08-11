import React from 'react';

export const PlaceholderPage: React.FC<{ title: string; description: string }> = ({ title, description }) => {
  return (
    <div>
      <div className="header">
        <div>
          <h2>{title}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{description}</p>
        </div>
      </div>
      <div className="glass-card">
        <p style={{ color: 'var(--text-secondary)' }}>
          This module will be fully built out in its designated roadmap phase.
        </p>
      </div>
    </div>
  );
};
