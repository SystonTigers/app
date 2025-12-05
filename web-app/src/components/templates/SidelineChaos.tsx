
import React from 'react';
import { MatchData } from './ModernDark';

export const SidelineChaos: React.FC<{ data: MatchData }> = ({ data }) => {
    const primaryColor = data.themeColor || '#ef4444';

    return (
        <div style={{
            width: 1080, height: 1080,
            background: '#fff',
            color: '#000',
            fontFamily: 'Impact, sans-serif',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Torn Paper Effect */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '50%', background: primaryColor, clipPath: 'polygon(0 0, 100% 0, 100% 80%, 0 100%)' }} />

            <div style={{ position: 'relative', zIndex: 1, padding: 60, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <h1 style={{ fontSize: 150, color: 'white', textTransform: 'uppercase', lineHeight: 0.9 }}>
                    It's<br />Match<br />Day
                </h1>

                <div style={{ transform: 'rotate(-5deg)', marginTop: 40 }}>
                    <div style={{ background: 'black', color: 'white', padding: '10px 30px', fontSize: 50, display: 'inline-block' }}>{data.homeTeam}</div>
                    <div style={{ background: 'black', color: primaryColor, padding: '10px 30px', fontSize: 50, display: 'inline-block', marginTop: 10 }}>VS {data.awayTeam}</div>
                </div>
            </div>
        </div>
    );
};
