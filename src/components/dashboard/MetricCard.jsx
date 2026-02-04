import React from 'react';

export default function MetricCard({ label, value, subtext }) {
    return (
        <div className="card glass-card text-center" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{value}</div>
            {subtext && <div className="text-muted" style={{ fontSize: '10px' }}>{subtext}</div>}
        </div>
    );
}
