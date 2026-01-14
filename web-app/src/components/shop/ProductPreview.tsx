'use client';

import { useMemo } from 'react';

interface Personalization {
    clubName: string;
    clubLogo?: string;
    playerName?: string;
    playerNumber?: string;
    supportsName: boolean;
    supportsNumber: boolean;
    supportsPhrase: boolean;
}

interface ProductPreviewProps {
    imageUrl: string;
    productTitle: string;
    personalization?: Personalization;
    className?: string;
}

export function ProductPreview({ imageUrl, productTitle, personalization, className = '' }: ProductPreviewProps) {
    const isMug = productTitle.toLowerCase().includes('mug');
    const isTShirt = productTitle.toLowerCase().includes('t-shirt') || productTitle.toLowerCase().includes('shirt');
    const isHoodie = productTitle.toLowerCase().includes('hoodie');

    // Determine basic positioning based on product type
    // This is a naive heuristic but better than random
    const textStyle = useMemo(() => {
        if (isMug) {
            return {
                top: '40%',
                left: '60%', // Wrap around effect? hard to do in 2D. Let's just put it on the "face"
                width: '30%',
                fontSize: '1em',
            };
        }
        return {
            top: '30%',
            left: '25%', // Center chest area roughly
            width: '50%',
            fontSize: '1.2em',
        };
    }, [isMug, isTShirt, isHoodie]);

    if (!personalization) {
        return <img src={imageUrl} alt={productTitle} className={`w-full h-full object-cover ${className}`} />;
    }

    const { playerName, playerNumber, clubLogo, supportsName, supportsNumber } = personalization;
    const showName = supportsName && playerName;
    const showNumber = supportsNumber && playerNumber;

    return (
        <div className={`relative w-full h-full overflow-hidden ${className}`}>
            <img src={imageUrl} alt={productTitle} className="w-full h-full object-cover" />

            {/* Overlay Container */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* 
                   We use an absolute div positioned specifically for the print area.
                   Since we don't have exact print area coordinates from Printify in this view,
                   we approximate center-chest.
                */}
                <div
                    className="flex flex-col items-center justify-center text-center opacity-90 mix-blend-multiply"
                    style={{
                        transform: 'translateY(-10%)', // Shift up slightly to hit chest height usually
                        width: '50%',
                    }}
                >
                    {/* Club Logo if available */}
                    {clubLogo && (
                        <img
                            src={clubLogo}
                            alt="Club Badge"
                            className="w-16 h-16 object-contain mb-2 drop-shadow-sm"
                        />
                    )}

                    {/* Name */}
                    {showName && (
                        <div
                            className="font-black text-white drop-shadow-md uppercase tracking-wide"
                            style={{
                                fontFamily: 'sans-serif',
                                fontSize: 'clamp(1rem, 4vw, 2rem)',
                                color: '#ffffff', // Assuming dark shirt, need better contrast logic later
                                textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                            }}
                        >
                            {playerName}
                        </div>
                    )}

                    {/* Number */}
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
