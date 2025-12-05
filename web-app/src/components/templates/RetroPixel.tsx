import React from 'react';
import { motion } from 'framer-motion';
import { MatchData } from './ModernDark';

export const RetroPixel: React.FC<{ data: MatchData }> = ({ data }) => {
    const primaryColor = data.themeColor || '#4ade80';

    return (
        <div style={{
            width: 1080, height: 1080,
            background: '#2c2c2c',
            fontFamily: '"Press Start 2P", cursive',
            color: '#fff',
            imageRendering: 'pixelated',
            textTransform: 'uppercase',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
            <div style={{ padding: 40, width: '100%', borderBottom: `8px dashed ${primaryColor}`, textAlign: 'center' }}>
                <h1 style={{ fontSize: 40, color: primaryColor }}>{data.competition}</h1>
            </div>

            {/* VS Screen */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 60 }}>
                <div style={{ textAlign: 'center' }}>
                    {data.homeBadge && <img src={data.homeBadge} width={200} style={{ imageRendering: 'pixelated' }} />}
                    <div style={{ marginTop: 20, fontSize: 30 }}>P1</div>
                </div>
                <div style={{ fontSize: 60, color: '#ff0000', animation: 'blink 1s infinite' }}>VS</div>
                <div style={{ textAlign: 'center' }}>
                    {data.awayBadge && <img src={data.awayBadge} width={200} style={{ imageRendering: 'pixelated' }} />}
                    <div style={{ marginTop: 20, fontSize: 30 }}>P2</div>
                </div>
            </div>

            <div style={{ padding: 40, width: '100%', background: primaryColor, color: 'black', textAlign: 'center' }}>
                <div style={{ fontSize: 30 }}>INSERT COIN TO START</div>
            </div>
        </div>
    );
};
