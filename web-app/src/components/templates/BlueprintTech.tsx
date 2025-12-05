
import React from 'react';
import { MatchData } from './ModernDark';

export const BlueprintTech: React.FC<{ data: MatchData }> = ({ data }) => {
    const primaryColor = data.themeColor || '#3b82f6';

    return (
        <div style={{
            width: 1080, height: 1080,
            background: '#0f172a',
            color: primaryColor,
            fontFamily: 'monospace',
            display: 'flex', flexDirection: 'column',
            backgroundImage: `linear-gradient(${primaryColor}33 1px, transparent 1px), linear-gradient(90deg, ${primaryColor}33 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
        }}>
            <div style={{ padding: 60, border: `4px solid ${primaryColor}`, height: '100%', margin: 40, position: 'relative' }}>
                {/* Tech Lines */}
                <div style={{ position: 'absolute', top: 0, left: '50%', height: '100%', width: 1, background: primaryColor }}></div>
                <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: 1, background: primaryColor }}></div>

                <div style={{ position: 'absolute', top: 60, left: 60, fontSize: 30 }}>CONFIDENTIAL // MATCH_DATA</div>

                <div style={{ position: 'absolute', top: '40%', left: 100 }}>
                    <div style={{ fontSize: 40 }}>HOME_UNIT</div>
                    <div style={{ fontSize: 80, fontWeight: 'bold' }}>{data.homeTeam}</div>
                </div>

                <div style={{ position: 'absolute', bottom: 100, right: 100, textAlign: 'right' }}>
                    <div style={{ fontSize: 60 }}>T-MINUS: {data.time}</div>
                    <div style={{ fontSize: 30 }}>COORDINATES: {data.venue}</div>
                </div>
            </div>
        </div>
    );
};
