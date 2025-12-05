
import React from 'react';
import { MatchData } from './ModernDark';

export const TradingCard: React.FC<{ data: MatchData }> = ({ data }) => {
    const primaryColor = data.themeColor || '#d4af37'; // Gold

    return (
        <div style={{
            width: 1080, height: 1080,
            background: `linear-gradient(135deg, #222, #444)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 60
        }}>
            <div style={{
                width: '100%', height: '100%',
                background: 'white',
                borderRadius: 40,
                padding: 30,
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column',
                border: `10px solid ${primaryColor}`
            }}>
                <div style={{ flex: 1, background: '#eee', borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
                    {/* Player/Team Image Placeholder */}
                    {data.motmPlayer?.image && <img src={data.motmPlayer.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <div style={{ position: 'absolute', bottom: 0, width: '100%', background: `linear-gradient(transparent, ${primaryColor})`, height: 200 }} />
                </div>

                <div style={{ marginTop: 30 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h1 style={{ fontSize: 60, margin: 0 }}>{data.homeTeam}</h1>
                        <div style={{ fontSize: 40, fontWeight: 'bold', color: primaryColor }}>2025</div>
                    </div>
                    <div style={{ width: '100%', height: 4, background: '#ddd', margin: '20px 0' }} />
                    <div style={{ display: 'flex', gap: 40, fontSize: 30, color: '#666' }}>
                        <div>ATT: 98</div>
                        <div>DEF: 85</div>
                        <div>PWR: 92</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
