
import React from 'react';
import { MatchData } from './ModernDark';

export const ComicBook: React.FC<{ data: MatchData }> = ({ data }) => {
    const primaryColor = data.themeColor || '#facc15'; // Yellow default

    return (
        <div style={{
            width: 1080, height: 1080,
            background: 'white',
            backgroundImage: 'radial-gradient(circle, #ddd 10%, transparent 11%)',
            backgroundSize: '20px 20px', // Halftone effect
            color: 'black',
            fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif',
            border: '40px solid black',
            display: 'flex', flexDirection: 'column', padding: 40
        }}>
            {/* Action Burst */}
            <div style={{ position: 'absolute', top: -50, right: -50, background: primaryColor, padding: 80, clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)', transform: 'rotate(15deg)', border: '4px solid black' }}>
                <h1 style={{ fontSize: 60, margin: 0, fontWeight: 900 }}>POW!</h1>
            </div>

            <div style={{ marginTop: 200, border: '8px solid black', padding: 40, boxShadow: '20px 20px 0 black', background: 'white' }}>
                <h2 style={{ fontSize: 80, fontWeight: 900, textTransform: 'uppercase' }}>{data.homeTeam}</h2>
                <div style={{ fontSize: 50, fontStyle: 'italic' }}>vs the villains...</div>
                <h2 style={{ fontSize: 80, fontWeight: 900, textTransform: 'uppercase', color: 'red' }}>{data.awayTeam}</h2>
            </div>
        </div>
    );
};
