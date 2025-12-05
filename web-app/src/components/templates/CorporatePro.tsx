import React from 'react';
import { MatchData } from './ModernDark';

export const CorporatePro: React.FC<{ data: MatchData }> = ({ data }) => {
    const primaryColor = data.themeColor || '#0ea5e9';

    return (
        <div style={{
            width: 1080, height: 1080,
            background: 'white',
            color: '#0f172a',
            fontFamily: '"Helvetica Neue", Arial, sans-serif',
            display: 'flex', flexDirection: 'column'
        }}>
            <div style={{ height: 40, background: primaryColor }} />

            <div style={{ flex: 1, padding: 80, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ fontSize: 30, fontWeight: 700, color: '#64748b' }}>OFFICIAL FIXTURE</div>
                    </div>
                    {data.homeBadge && <img src={data.homeBadge} width={80} />}
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 80 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 80, fontWeight: 800 }}>{data.score?.home ?? '-'}</div>
                        <div style={{ fontSize: 30, fontWeight: 600 }}>HOME</div>
                    </div>
                    <div style={{ height: 200, width: 2, background: '#e2e8f0' }} />
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 80, fontWeight: 800 }}>{data.score?.away ?? '-'}</div>
                        <div style={{ fontSize: 30, fontWeight: 600 }}>AWAY</div>
                    </div>
                </div>
            </div>

            <div style={{ background: '#f8fafc', padding: 60, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: primaryColor }}>NEXT UP</div>
                    <div style={{ fontSize: 40, fontWeight: 800 }}>{data.date}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 24, fontWeight: 600, color: primaryColor }}>LOCATION</div>
                    <div style={{ fontSize: 40, fontWeight: 800 }}>{data.venue}</div>
                </div>
            </div>
        </div>
    );
};
