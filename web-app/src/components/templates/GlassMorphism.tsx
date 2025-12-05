
import React from 'react';
import { MatchData } from './ModernDark';

export const GlassMorphism: React.FC<{ data: MatchData }> = ({ data }) => {
    const primaryColor = data.themeColor || '#ec4899';

    return (
        <div style={{
            width: 1080, height: 1080,
            background: `linear-gradient(45deg, #000, ${primaryColor})`,
            color: 'white',
            fontFamily: 'Inter, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            {/* Glass Card */}
            <div style={{
                width: 800, height: 800,
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(40px)',
                borderRadius: 60,
                border: '2px solid rgba(255,255,255,0.2)',
                boxShadow: '0 20px 80px rgba(0,0,0,0.4)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 60
            }}>
                <div style={{ fontSize: 40, letterSpacing: 10, marginBottom: 60, opacity: 0.8 }}>{data.competition}</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
                    {data.homeBadge && <img src={data.homeBadge} width={180} />}
                    <div style={{ fontSize: 60, fontWeight: 300 }}>vs</div>
                    {data.awayBadge && <img src={data.awayBadge} width={180} />}
                </div>

                <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,0.2)', margin: '60px 0' }} />

                <h1 style={{ fontSize: 80, fontWeight: 900 }}>{data.time}</h1>
                <div style={{ fontSize: 30 }}>{data.venue}</div>
            </div>
        </div>
    );
};
