
import React from 'react';
import { MatchData } from './ModernDark';

export const EditorialMag: React.FC<{ data: MatchData }> = ({ data }) => {
    const primaryColor = data.themeColor || '#000';

    return (
        <div style={{
            width: 1080, height: 1080,
            background: '#fff',
            color: '#000',
            fontFamily: 'serif',
            position: 'relative'
        }}>
            {/* Huge Letter Behind */}
            <div style={{ position: 'absolute', top: -100, left: -50, fontSize: 800, color: '#f0f0f0', fontWeight: 900, zIndex: 0 }}>
                {data.homeTeam.charAt(0)}
            </div>

            <div style={{ position: 'relative', zIndex: 1, padding: 80, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 30, letterSpacing: 4, textTransform: 'uppercase', borderBottom: '2px solid black', paddingBottom: 20, marginBottom: 60 }}>
                    VOL 12 • ISSUE 4
                </div>

                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: 120, lineHeight: 0.9, marginBottom: 40 }}>
                        The Big<br />Match<br /><span style={{ color: primaryColor }}>Preview</span>
                    </h1>
                    <p style={{ fontSize: 40, maxWidth: 600, color: '#555', fontStyle: 'italic' }}>
                        "{data.quote?.text || 'A defining moment in the season.'}"
                    </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <div style={{ fontSize: 24, color: '#888' }}>VENUE</div>
                        <div style={{ fontSize: 40, fontWeight: 600 }}>{data.venue}</div>
                    </div>
                    <div style={{ fontSize: 100, fontWeight: 900 }}>{data.time}</div>
                </div>
            </div>
        </div>
    );
};
