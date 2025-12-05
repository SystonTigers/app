
import React from 'react';
import { MatchData } from './ModernDark';

export const VintageClassic: React.FC<{ data: MatchData }> = ({ data }) => {
    const primaryColor = data.themeColor || '#8B0000';

    return (
        <div style={{
            width: 1080, height: 1080,
            background: '#fdfbf7', // Cream
            color: '#2a2a2a',
            fontFamily: '"Times New Roman", serif',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            border: `40px double ${primaryColor}`
        }}>
            <div style={{ fontSize: 40, fontStyle: 'italic', letterSpacing: 2, marginBottom: 40 }}>The Official Match Programme</div>

            <div style={{ width: 200, height: 2, background: 'black', marginBottom: 60 }} />

            <div style={{ fontSize: 80, fontWeight: 'bold' }}>{data.homeTeam}</div>
            <div style={{ fontSize: 40, margin: '20px 0' }}>— v —</div>
            <div style={{ fontSize: 80, fontWeight: 'bold', color: primaryColor }}>{data.awayTeam}</div>

            <div style={{ marginTop: 80, fontSize: 35, textAlign: 'center' }}>
                {data.venue}<br />
                Kick Off: {data.time}
            </div>
        </div>
    );
};
