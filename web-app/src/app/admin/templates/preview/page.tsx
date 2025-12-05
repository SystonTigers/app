
'use client';
import React, { useState, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { ModernDarkTheme, MatchData } from '@/components/templates/ModernDark';
import { MinimalistLightArgs } from '@/components/templates/MinimalistLight';
import { ImpactNeon } from '@/components/templates/ImpactNeon';
import { RetroPixel } from '@/components/templates/RetroPixel';
import { GrungeUrban } from '@/components/templates/GrungeUrban';
import { CorporatePro } from '@/components/templates/CorporatePro';
import { GlassMorphism } from '@/components/templates/GlassMorphism';
import { SidelineChaos } from '@/components/templates/SidelineChaos';
import { VintageClassic } from '@/components/templates/VintageClassic';
import { BroadcastTV } from '@/components/templates/BroadcastTV';
import { ComicBook } from '@/components/templates/ComicBook';
import { BlueprintTech } from '@/components/templates/BlueprintTech';
import { TradingCard } from '@/components/templates/TradingCard';
import { GlitchCyber } from '@/components/templates/GlitchCyber';
import { EditorialMag } from '@/components/templates/EditorialMag';

export default function TemplateReview() {
    const [activeTab, setActiveTab] = useState<'fixture' | 'goal' | 'result' | 'squad'>('fixture');
    const [activeTheme, setActiveTheme] = useState<string>('modern');
    const [userColor, setUserColor] = useState('#f97316');
    const ref = useRef<HTMLDivElement>(null);

    const downloadImage = useCallback(() => {
        if (ref.current === null) { return; }

        toPng(ref.current, { cacheBust: true, pixelRatio: 1 })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `match-graphic-${activeTheme}-${activeTab}.png`;
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => {
                console.error('oops, something went wrong!', err);
            });
    }, [ref, activeTheme, activeTab]);

    const mockData: MatchData = {
        type: activeTab,
        homeTeam: 'Syston Tigers',
        awayTeam: 'Anstey Nomads',
        homeBadge: '/assets/badges/syston.png',
        awayBadge: '/assets/badges/anstey.png',
        themeColor: userColor,
        competition: 'League Cup',
        date: 'Sat 12 Dec',
        time: '15:00',
        venue: 'Memorial Park',
        score: { home: 2, away: 1 },
        scorers: [{ name: 'J. Smith', minute: '23' }],
        squadList: Array(11).fill({ name: 'Player Name', number: 7, position: 'MID' })
    };

    const themes: Record<string, React.FC<{ data: MatchData }>> = {
        modern: ModernDarkTheme,
        minimal: MinimalistLightArgs,
        impact: ImpactNeon,
        retro: RetroPixel,
        grunge: GrungeUrban,
        corporate: CorporatePro,
        glass: GlassMorphism,
        chaos: SidelineChaos,
        vintage: VintageClassic,
        broadcast: BroadcastTV,
        comic: ComicBook,
        blueprint: BlueprintTech,
        trading: TradingCard,
        glitch: GlitchCyber,
        editorial: EditorialMag
    };

    const CurrentTheme = themes[activeTheme] || ModernDarkTheme;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-10 flex flex-col items-center gap-10">
            <h1 className="text-3xl font-bold">Template Theme Browser</h1>

            {/* Controls */}
            <div className="flex flex-col gap-4 items-center bg-gray-800 p-6 rounded-xl w-full max-w-6xl">
                <div className="flex gap-4 items-center w-full justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-gray-400">Club Color:</span>
                        <input type="color" value={userColor} onChange={(e) => setUserColor(e.target.value)} className="h-10 w-20 cursor-pointer" />
                    </div>
                    <button
                        onClick={downloadImage}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded font-bold flex items-center gap-2"
                    >
                        <span>💾</span> Download as PNG
                    </button>
                </div>

                {/* Theme Selector Grid */}
                <div className="grid grid-cols-5 gap-2 w-full">
                    {Object.keys(themes).map(theme => (
                        <button
                            key={theme}
                            onClick={() => setActiveTheme(theme)}
                            className={`px-2 py-2 text-sm rounded capitalize ${activeTheme === theme ? 'bg-white text-black font-bold' : 'bg-gray-700 hover:bg-gray-600'}`}
                        >
                            {theme}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 flex-wrap justify-center border-t border-gray-700 pt-4 w-full">
                    {['fixture', 'goal', 'result', 'squad'].map(type => (
                        <button
                            key={type}
                            onClick={() => setActiveTab(type as any)}
                            className={`px-3 py-1 text-sm rounded ${activeTab === type ? 'bg-blue-600' : 'bg-gray-700'}`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Preview Canvas */}
            <div className="border border-gray-700 shadow-2xl overflow-hidden rounded-xl bg-black">
                {/* We use a Ref here to target this specific div for the PNG capture */}
                <div ref={ref}>
                    <CurrentTheme data={mockData} />
                </div>
            </div>

            <p className="text-gray-400 text-center max-w-lg">
                Each theme is a reusable component that automatically styles itself based on the club's `primaryColor`.
            </p>
        </div>
    );
}
