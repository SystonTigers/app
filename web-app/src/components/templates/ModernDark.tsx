
import React from 'react';
import { motion } from 'framer-motion';

export interface MatchData {
    type:
    | 'fixture' | 'result' | 'goal' | 'motm' | 'squad' | 'quote'
    | 'postponed' | 'halftime' | 'fulltime' | 'kickoff'
    | 'countdown' | 'throwback' | 'second_half' | 'league_results'
    | 'week_fixtures' | 'next_fixture' | 'month_fixtures' | 'league_table'
    | 'cup_fixture' | 'cup_result' | 'motm_voting' | 'gotm_comp' | 'gotm_result'
    | 'card' | 'sub';
    homeTeam: string;
    awayTeam?: string;
    homeBadge?: string;
    awayBadge?: string;
    score?: { home: number; away: number };
    date?: string;
    time?: string;
    venue?: string;
    competition?: string;
    scorers?: { name: string; minute: string; assister?: string; image?: string }[];
    motmPlayer?: { name: string; image?: string; stats?: string };
    squadList?: { position: string; name: string; number: number }[];
    quote?: { text: string; author: string };
    themeColor?: string;
    showScorerImage?: boolean;
    card?: { type: 'yellow' | 'red'; player: string; minute: string };
    sub?: { in: string; out: string; minute: string };

    countdown?: { days: number; text: string };
    throwback?: { year: string; description: string; image: string };
    leagueTable?: { position: number; team: string; played: number; points: number }[];
    weekFixtures?: { date: string; home: string; away: string; time: string }[];
    gotm?: { candidates: { name: string; videoUrl?: string }[] } | { winner: string; videoUrl?: string };
}

export const ModernDarkTheme: React.FC<{ data: MatchData }> = ({ data }) => {
    const primaryColor = data.themeColor || '#f97316';

    const bgVariants = {
        animate: {
            backgroundPosition: ['0% 0%', '100% 100%'],
            transition: { duration: 20, repeat: Infinity, repeatType: 'reverse' as const }
        }
    };

    return (
        <div style={{
            width: 1080,
            height: 1080,
            background: '#111',
            color: 'white',
            fontFamily: 'Inter, sans-serif',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <motion.div
                variants={bgVariants}
                animate="animate"
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(circle at 50% 50%, ${primaryColor}40 0%, transparent 70%)`,
                    zIndex: 0
                }}
            />

            <div style={{ zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', padding: 60 }}>

                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        alignSelf: 'center',
                        background: 'rgba(255,255,255,0.1)',
                        padding: '10px 30px',
                        borderRadius: 50,
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        fontSize: 24,
                        fontWeight: 600,
                        marginBottom: 40
                    }}
                >
                    {data.competition || 'Match Day'}
                </motion.div>

                {/* --- VARIATION: MATCH DAY / KICK OFF / NEXT FIXTURE / CUP FIXTURE --- */}
                {['fixture', 'kickoff', 'next_fixture', 'cup_fixture', 'second_half'].includes(data.type) && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 40 }}>
                        {data.type === 'second_half' && <h2 style={{ fontSize: 50, color: '#aaa' }}>SECOND HALF KICK OFF</h2>}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 60 }}>
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
                                {data.homeBadge ? <img src={data.homeBadge} width={250} height={250} style={{ objectFit: 'contain' }} /> : <div style={{ width: 250, height: 250, background: '#333', borderRadius: '50%' }} />}
                            </motion.div>
                            <div style={{ fontSize: 60, fontWeight: 900, opacity: 0.5 }}>VS</div>
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}>
                                {data.awayBadge ? <img src={data.awayBadge} width={250} height={250} style={{ objectFit: 'contain' }} /> : <div style={{ width: 250, height: 250, background: '#333', borderRadius: '50%' }} />}
                            </motion.div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                                <h1 style={{ fontSize: 80, margin: 0, lineHeight: 1 }}>{data.time}</h1>
                                <h2 style={{ fontSize: 40, margin: '20px 0 0 0', fontWeight: 400, color: '#aaa' }}>{data.date}</h2>
                                <h3 style={{ fontSize: 30, margin: '10px 0 0 0', color: primaryColor }}>@ {data.venue}</h3>
                            </motion.div>
                        </div>
                    </div>
                )}

                {/* --- VARIATION: COUNTDOWN --- */}
                {data.type === 'countdown' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            style={{ fontSize: 400, fontWeight: 900, lineHeight: 0.8, color: primaryColor }}
                        >
                            {data.countdown?.days}
                        </motion.div>
                        <h2 style={{ fontSize: 80, textTransform: 'uppercase', letterSpacing: 10 }}>DAYS TO GO</h2>
                        <p style={{ fontSize: 40, color: '#aaa', marginTop: 40 }}>{data.countdown?.text}</p>
                    </div>
                )}

                {/* --- VARIATION: GOAL! --- */}
                {data.type === 'goal' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <motion.h1
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                            transition={{ duration: 0.8, times: [0, 0.5, 1] }}
                            style={{ fontSize: 200, margin: 0, color: primaryColor, fontStyle: 'italic', lineHeight: 0.8 }}
                        >
                            GOAL!
                        </motion.h1>

                        {/* Player Image Overlay */}
                        {data.showScorerImage && data.scorers?.[0]?.image && (
                            <motion.div
                                initial={{ opacity: 0, x: 100 }}
                                animate={{ opacity: 1, x: 0 }}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    height: '100%',
                                    width: '60%',
                                    zIndex: 0,
                                    backgroundImage: `url(${data.scorers[0].image})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    maskImage: 'linear-gradient(to right, transparent, black 40%)'
                                }}
                            />
                        )}

                        {data.scorers && data.scorers[0] && (
                            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} style={{ zIndex: 1 }}>
                                <h2 style={{ fontSize: 80, margin: '40px 0 0 0' }}>{data.scorers[0].name}</h2>
                                <p style={{ fontSize: 50, margin: 0, textAlign: 'center', color: '#aaa' }}>{data.scorers[0].minute}'</p>
                                {data.scorers[0].assister && (
                                    <div style={{ fontSize: 30, color: primaryColor, marginTop: 10 }}>Assist: {data.scorers[0].assister}</div>
                                )}
                            </motion.div>
                        )}

                        <div style={{ marginTop: 80, fontSize: 100, fontWeight: 900 }}>
                            {data.score?.home} - {data.score?.away}
                        </div>
                    </div>
                )}

                {/* --- VARIATION: CARD --- */}
                {data.type === 'card' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <motion.div
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            style={{
                                width: 200,
                                height: 300,
                                background: data.card?.type === 'red' ? '#dc2626' : '#facc15',
                                borderRadius: 10,
                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                marginBottom: 60
                            }}
                        />
                        <h2 style={{ fontSize: 80, margin: 0 }}>{data.card?.player}</h2>
                        <p style={{ fontSize: 50, color: '#aaa', marginTop: 20 }}>{data.card?.minute}'</p>
                        <h3 style={{ fontSize: 40, marginTop: 40, color: data.card?.type === 'red' ? '#dc2626' : '#facc15' }}>
                            {data.card?.type === 'red' ? 'RED CARD' : 'YELLOW CARD'}
                        </h3>
                    </div>
                )}

                {/* --- VARIATION: SUBSTITUTION --- */}
                {data.type === 'sub' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 60, width: '100%', alignItems: 'center' }}>
                            <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
                                <div style={{ fontSize: 80, color: '#22c55e' }}>⬆</div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: 30, color: '#22c55e', fontWeight: 'bold' }}>ON</div>
                                    <div style={{ fontSize: 60 }}>{data.sub?.in}</div>
                                </div>
                            </motion.div>

                            <div style={{ width: '60%', height: 2, background: '#333' }} />

                            <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
                                <div style={{ fontSize: 80, color: '#ef4444' }}>⬇</div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: 30, color: '#ef4444', fontWeight: 'bold' }}>OFF</div>
                                    <div style={{ fontSize: 60, opacity: 0.6 }}>{data.sub?.out}</div>
                                </div>
                            </motion.div>
                        </div>
                        <p style={{ fontSize: 40, color: '#aaa', marginTop: 80 }}>{data.sub?.minute}'</p>
                    </div>
                )}

                {/* --- VARIATION: RESULT / FULL TIME / HALF TIME / CUP RESULT --- */}
                {['result', 'fulltime', 'halftime', 'cup_result', 'league_results'].includes(data.type) && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <motion.div
                            style={{ fontSize: 40, letterSpacing: 5, marginBottom: 60, color: '#aaa' }}
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            {data.type === 'halftime' ? 'HALF TIME' : 'FULL TIME'}
                        </motion.div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 80 }}>
                            {/* Home */}
                            <div style={{ textAlign: 'center' }}>
                                {data.homeBadge && <img src={data.homeBadge} width={150} height={150} style={{ marginBottom: 20 }} />}
                                <motion.div
                                    initial={{ y: 100, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    style={{ fontSize: 180, fontWeight: 900, lineHeight: 1 }}
                                >
                                    {data.score?.home}
                                </motion.div>
                            </div>

                            <div style={{ width: 4, height: 150, background: 'rgba(255,255,255,0.2)' }}></div>

                            {/* Away */}
                            <div style={{ textAlign: 'center' }}>
                                {data.awayBadge && <img src={data.awayBadge} width={150} height={150} style={{ marginBottom: 20 }} />}
                                <motion.div
                                    initial={{ y: 100, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    style={{ fontSize: 180, fontWeight: 900, lineHeight: 1 }}
                                >
                                    {data.score?.away}
                                </motion.div>
                            </div>
                        </div>

                        {data.scorers && data.scorers.length > 0 && (
                            <div style={{ marginTop: 60, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                                {data.scorers.map((s, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 1 + (i * 0.1) }}
                                        style={{ fontSize: 30, color: '#ccc' }}
                                    >
                                        {s.name} ({s.minute}') ⚽
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {data.competition?.toLowerCase().includes('cup') && (
                            <div style={{ marginTop: 20, color: primaryColor, fontSize: 30 }}>
                                {data.score?.home && data.score?.away && data.score.home > data.score.away ? 'THROUGH TO NEXT ROUND!' : ''}
                            </div>
                        )}
                    </div>
                )}

                {/* --- VARIATION: LEAGUE TABLE --- */}
                {data.type === 'league_table' && (
                    <div style={{ flex: 1, padding: '0 40px', width: '100%' }}>
                        <h2 style={{ fontSize: 60, marginBottom: 40, textAlign: 'center' }}>LEAGUE TABLE</h2>
                        <div style={{ display: 'flex', borderBottom: '2px solid #333', padding: 20, fontSize: 30, color: '#888' }}>
                            <div style={{ width: 100 }}>#</div>
                            <div style={{ flex: 1 }}>Team</div>
                            <div style={{ width: 100 }}>P</div>
                            <div style={{ width: 100 }}>Pts</div>
                        </div>
                        {data.leagueTable?.map((row, i) => (
                            <motion.div
                                key={i}
                                initial={{ x: -50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.05 }}
                                style={{
                                    display: 'flex',
                                    padding: '25px 20px',
                                    fontSize: 35,
                                    background: row.team === data.homeTeam ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    borderBottom: '1px solid #222'
                                }}
                            >
                                <div style={{ width: 100 }}>{row.position}</div>
                                <div style={{ flex: 1, fontWeight: row.team === data.homeTeam ? 'bold' : 'normal' }}>{row.team}</div>
                                <div style={{ width: 100 }}>{row.played}</div>
                                <div style={{ width: 100, fontWeight: 'bold', color: primaryColor }}>{row.points}</div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* --- VARIATION: SQUAD / STARTING XI --- */}
                {data.type === 'squad' && (
                    <div style={{ flex: 1, display: 'flex', gap: 40 }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <h2 style={{ fontSize: 80, lineHeight: 1, marginBottom: 40 }}>STARTING<br /><span style={{ color: primaryColor }}>ELEVEN</span></h2>
                            {data.squadList?.slice(0, 11).map((p, i) => (
                                <div key={i} style={{ fontSize: 35, marginBottom: 15, borderBottom: '1px solid #222' }}>
                                    <span style={{ color: '#888', width: 50, display: 'inline-block' }}>{p.number}</span>
                                    {p.name}
                                </div>
                            ))}
                        </div>
                        <div style={{ width: 400, background: `linear-gradient(to bottom, ${primaryColor}20, transparent)`, borderRadius: 20 }}>
                        </div>
                    </div>
                )}

                {/* --- VARIATION: MOTM / MOTM VOTING --- */}
                {(data.type === 'motm' || data.type === 'motm_voting') && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ width: 600, height: 600, background: '#333', borderRadius: '50%', overflow: 'hidden' }}>
                                {data.motmPlayer?.image && <img src={data.motmPlayer.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                            </div>
                            <div style={{ position: 'absolute', bottom: 50, left: -50, background: primaryColor, padding: '20px 60px', borderRadius: 40 }}>
                                <h2 style={{ fontSize: 60, margin: 0, color: 'black' }}>{data.motmPlayer?.name}</h2>
                            </div>
                        </div>
                        <div style={{ position: 'absolute', top: 100, right: 50, textAlign: 'right' }}>
                            <h1 style={{ fontSize: 120, margin: 0, lineHeight: 1, textShadow: '0 10px 30px black' }}>MAN<br />OF THE<br />MATCH</h1>
                            {data.type === 'motm_voting' && <div style={{ fontSize: 40, marginTop: 40, background: 'white', color: 'black', padding: 20, display: 'inline-block', borderRadius: 10 }}>VOTE NOW</div>}
                        </div>
                    </div>
                )}

                {/* --- VARIATION: THROWBACK --- */}
                {data.type === 'throwback' && (
                    <div style={{ flex: 1, position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 20, border: `2px solid ${primaryColor}`, padding: 40 }}>
                            <h1 style={{ fontSize: 100, marginTop: 0 }}>THROW<br />BACK</h1>
                            <h2 style={{ fontSize: 150, color: primaryColor, opacity: 0.2, position: 'absolute', top: 20, right: 40 }}>{data.throwback?.year}</h2>
                            <p style={{ fontSize: 40, marginTop: 400, background: 'rgba(0,0,0,0.7)', padding: 40 }}>{data.throwback?.description}</p>
                        </div>
                    </div>
                )}

            </div>

            <div style={{ padding: 40, borderTop: '2px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: primaryColor }}></div>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white' }}></div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: 1 }}>systontigers.com</div>
            </div>
        </div>
    );
};
