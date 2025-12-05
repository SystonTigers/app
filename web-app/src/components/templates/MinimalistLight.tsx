
import React from 'react';
import { motion } from 'framer-motion';
import { MatchData } from './ModernDark';

export const MinimalistLightArgs: React.FC<{ data: MatchData }> = ({ data }) => {
    const primaryColor = data.themeColor || '#000000'; // Defaults to Black if no color

    // A clean, white canvas with subtle animations
    return (
        <div style={{
            width: 1080,
            height: 1080,
            background: '#ffffff',
            color: '#1a1a1a',
            fontFamily: 'Inter, sans-serif',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>

            {/* Abstract Color Shape */}
            <motion.div
                initial={{ x: 1000 }}
                animate={{ x: 0 }}
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '40%',
                    height: '100%',
                    background: primaryColor,
                    opacity: 0.1,
                    skewX: -20,
                    transformOrigin: 'top right'
                }}
            />

            <div style={{ flex: 1, padding: 80, display: 'flex', flexDirection: 'column', zIndex: 1 }}>

                {/* Top Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 60 }}>
                    <div style={{ fontSize: 30, textTransform: 'uppercase', letterSpacing: 4, fontWeight: 700, color: '#999' }}>
                        {data.competition || 'MATCH DAY'}
                    </div>
                    <div style={{ width: 60, height: 6, background: primaryColor }}></div>
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

                    {(data.type === 'fixture' || data.type === 'kickoff') && (
                        <>
                            <motion.h1
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                style={{ fontSize: 120, margin: 0, lineHeight: 0.9, fontWeight: 900 }}
                            >
                                {data.homeTeam.toUpperCase()}
                            </motion.h1>
                            <div style={{ fontSize: 60, fontFamily: 'serif', fontStyle: 'italic', margin: '20px 0', color: '#888' }}>versus</div>
                            <motion.h1
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                style={{ fontSize: 120, margin: 0, lineHeight: 0.9, fontWeight: 900, color: primaryColor }}
                            >
                                {data.awayTeam?.toUpperCase() || 'OPPONENT'}
                            </motion.h1>

                            <div style={{ marginTop: 80, display: 'flex', gap: 60 }}>
                                <div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#999', marginBottom: 10 }}>KICK OFF</div>
                                    <div style={{ fontSize: 50, fontWeight: 600 }}>{data.time}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#999', marginBottom: 10 }}>DATE</div>
                                    <div style={{ fontSize: 50, fontWeight: 600 }}>{data.date}</div>
                                </div>
                            </div>
                        </>
                    )}

                    {data.type === 'goal' && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 300, fontWeight: 900, lineHeight: 1, color: primaryColor }}>{data.score?.home}-{data.score?.away}</div>
                            <div style={{ fontSize: 100, fontWeight: 800, textTransform: 'uppercase' }}>GOAL!</div>
                            <div style={{ fontSize: 40, marginTop: 40, color: '#666' }}>{data.scorers?.[0]?.name} {data.scorers?.[0]?.minute}'</div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div style={{ marginTop: 'auto', paddingTop: 40, borderTop: '2px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 30, fontWeight: 600 }}>{data.venue}</div>
                </div>

            </div>
        </div>
    );
};
