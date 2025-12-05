
import React from 'react';
import { motion } from 'framer-motion';
import { MatchData } from './ModernDark';

export const ImpactNeon: React.FC<{ data: MatchData }> = ({ data }) => {
    const primaryColor = data.themeColor || '#22d3ee'; // Default Cyan

    return (
        <div style={{
            width: 1080,
            height: 1080,
            background: '#000',
            color: 'white',
            fontFamily: 'BioRhyme, serif', // Different font vibe
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>

            {/* Neon Glow Background */}
            <div style={{
                position: 'absolute',
                top: '-20%',
                left: '-20%',
                width: '140%',
                height: '140%',
                background: `conic-gradient(from 0deg, transparent 0%, ${primaryColor} 50%, transparent 100%)`,
                opacity: 0.3,
                animation: 'spin 10s linear infinite'
            }} />

            {/* Gritty Texture Overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22 opacity=%220.1%22/%3E%3C/svg%3E")',
                mixBlendMode: 'overlay'
            }} />

            <div style={{ zIndex: 1, padding: 40, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `20px solid ${primaryColor}` }}>

                <div style={{ background: primaryColor, color: 'black', padding: '10px 40px', fontSize: 40, fontWeight: 900, transform: 'rotate(-5deg)', marginBottom: 60 }}>
                    {data.competition?.toUpperCase() || 'MATCH DAY'}
                </div>

                {['fixture', 'kickoff'].includes(data.type) && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
                            <div style={{ width: 300, height: 300, border: `4px solid white`, padding: 20 }}>
                                {data.homeBadge && <img src={data.homeBadge} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                            </div>
                            <div style={{ fontSize: 100, fontStyle: 'italic', fontWeight: 900, textShadow: `10px 10px 0 ${primaryColor}` }}>VS</div>
                            <div style={{ width: 300, height: 300, border: `4px solid white`, padding: 20 }}>
                                {data.awayBadge && <img src={data.awayBadge} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                            </div>
                        </div>
                        <div style={{ marginTop: 60, fontSize: 60, fontWeight: 900, textAlign: 'center' }}>
                            {data.time} // {data.date}
                        </div>
                    </>
                )}

                {/* Add other variations... */}
            </div>
        </div>
    );
};
