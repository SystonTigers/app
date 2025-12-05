
import React from 'react';
import { MatchData } from './ModernDark';

export const BroadcastTV: React.FC<{ data: MatchData }> = ({ data }) => {
    const primaryColor = data.themeColor || '#0052cc';

    return (
        <div style={{
            width: 1080, height: 1080,
            background: 'url(/assets/backgrounds/stadium-blur.jpg)',
            backgroundSize: 'cover',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
            {/* Lower Third Graphic */}
            <div style={{ background: 'linear-gradient(to right, #000 60%, transparent)', padding: 60, marginBottom: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
                    {/* Score Bug */}
                    <div style={{ display: 'flex', background: 'white', color: 'black', fontWeight: 'bold', fontSize: 50, borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 40px' }}>{data.homeTeam.substring(0, 3).toUpperCase()}</div>
                        <div style={{ background: primaryColor, color: 'white', padding: '20px 40px' }}>{data.score?.home ?? 0}</div>
                        <div style={{ background: primaryColor, color: 'white', padding: '20px 40px' }}>{data.score?.away ?? 0}</div>
                        <div style={{ padding: '20px 40px' }}>{data.awayTeam?.substring(0, 3).toUpperCase()}</div>
                    </div>

                    <div style={{ color: '#fff', fontSize: 40, fontWeight: 700, textTransform: 'uppercase' }}>
                        {data.time} <span style={{ color: primaryColor }}>LIVE</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
