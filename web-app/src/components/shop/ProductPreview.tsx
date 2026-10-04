'use client';

import type { ProductPersonalization } from './types';

interface ProductPreviewProps {
    imageUrl: string;
    productTitle: string;
    personalization?: ProductPersonalization;
    className?: string;
}

export function ProductPreview({ imageUrl, productTitle, personalization, className = '' }: ProductPreviewProps) {
    if (!personalization) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={imageUrl} alt={productTitle} className={`w-full h-full object-cover ${className}`} />;
    }

    const { playerName, playerNumber, clubLogo, supportsName, supportsNumber } = personalization;
    const showName = supportsName && playerName;
    const showNumber = supportsNumber && playerNumber;

    return (
        <div className={`relative w-full h-full overflow-hidden ${className}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={productTitle} className="w-full h-full object-cover" />

            {/* The print area is roughly centre chest (Printify doesn't give us its exact position here) */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div
                    className="flex flex-col items-center justify-center text-center opacity-90 mix-blend-multiply"
                    style={{
                        transform: 'translateY(-10%)',
                        width: '50%',
                    }}
                >
                    {clubLogo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={clubLogo}
                            alt=""
                            className="w-16 h-16 object-contain mb-2 drop-shadow-sm"
                        />
                    )}

                    {showName && (
                        <div
                            className="font-black text-white drop-shadow-md uppercase tracking-wide"
                            style={{
                                fontFamily: 'sans-serif',
                                fontSize: 'clamp(1rem, 4vw, 2rem)',
                                color: '#ffffff',
                                textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                            }}
                        >
                            {playerName}
                        </div>
                    )}

                    {showNumber && (
                        <div
                            className="font-black text-white drop-shadow-md leading-none"
                            style={{
                                fontFamily: 'sans-serif',
                                fontSize: 'clamp(3rem, 10vw, 6rem)',
                                color: '#ffffff',
                                textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                            }}
                        >
                            {playerNumber}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
