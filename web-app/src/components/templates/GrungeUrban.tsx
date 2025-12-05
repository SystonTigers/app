import React from 'react';
import { MatchData } from './ModernDark';

export const GrungeUrban: React.FC<{ data: MatchData }> = ({ data }) => {
    const primaryColor = data.themeColor || '#fb923c';

    return (
        <div style={{
            width: 1080, height: 1080,
            background: '#1a1a1a',
            color: '#f0f0f0',
            fontFamily: 'Impact, sans-serif',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Texture */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'url(/assets/textures/concrete.jpg)' }} />

            {/* Paint Splash */}
            <div style={{
                position: 'absolute', top: -100, left: -200, width: 800, height: 1500,
                background: primaryColor, transform: 'rotate(15deg)', mixBlendMode: 'multiply'
            }} />

            <div style={{ position: 'relative', zIndex: 1, padding: 80, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h1 style={{ fontSize: 180, lineHeight: 0.9, letterSpacing: -5 }}>MATCH<br />DAY.</h1>
                <div style={{ width: 200, height: 20, background: 'white', margin: '40px 0' }} />

                <div style={{ fontSize: 60 }}>{data.homeTeam}</div>
                <div style={{ fontSize: 40, opacity: 0.7 }}>VS</div>
                <div style={{ fontSize: 60, color: primaryColor }}>{data.awayTeam}</div>

                <div style={{ marginTop: 'auto', fontSize: 40, border: `4px solid ${primaryColor}`, padding: 20, width: 'fit-content' }}>
                    {data.time} | {data.venue}
                </div>
            </div>
        </div>
    );
};
