
import React from 'react';
import { MatchData } from './ModernDark';

export const GlitchCyber: React.FC<{ data: MatchData }> = ({ data }) => {
    const primaryColor = data.themeColor || '#00ff00';

    return (
        <div style={{
            width: 1080, height: 1080,
            background: '#000',
            color: primaryColor,
            fontFamily: '"Courier New", monospace',
            position: 'relative', overflow: 'hidden'
        }}>
            <h1 style={{
                fontSize: 150, position: 'absolute', top: 100, left: -20,
                textShadow: `10px 0 red, -10px 0 blue`, opacity: 0.8
            }}>
                {data.homeTeam}
            </h1>

            <div style={{ position: 'absolute', top: '50%', width: '100%', height: 20, background: 'white', opacity: 0.2 }} />

            <div style={{ position: 'absolute', bottom: 100, right: 40, textAlign: 'right' }}>
                <div style={{ fontSize: 80, fontWeight: 900, background: primaryColor, color: 'black', padding: '0 20px' }}>
                    {data.score?.home ?? 0} : {data.score?.away ?? 0}
                </div>
                <div style={{ fontSize: 40, marginTop: 20 }}>SYSTEM.FAILURE // GAME OVER</div>
            </div>
        </div>
    );
};
