'use client';

import { useState, useCallback, ReactNode } from 'react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const [isPulling, setIsPulling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);

    const threshold = 80;
    let startY = 0;

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (window.scrollY === 0) {
            startY = e.touches[0].clientY;
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (window.scrollY > 0 || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const distance = Math.max(0, currentY - startY);

        if (distance > 0) {
            setIsPulling(true);
            setPullDistance(Math.min(distance * 0.5, 120));
        }
    }, [isRefreshing]);

    const handleTouchEnd = useCallback(async () => {
        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true);
            await onRefresh();
            setIsRefreshing(false);
        }
        setIsPulling(false);
        setPullDistance(0);
    }, [pullDistance, isRefreshing, onRefresh]);

    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative"
        >
            {/* Pull indicator */}
            <div
                className="absolute left-0 right-0 flex items-center justify-center transition-all duration-200 overflow-hidden"
                style={{
                    height: isPulling || isRefreshing ? pullDistance : 0,
                    top: 0,
                }}
            >
                <div className={`flex flex-col items-center transition-opacity ${pullDistance > 20 ? 'opacity-100' : 'opacity-0'}`}>
                    {isRefreshing ? (
                        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <div
                                className="text-2xl transition-transform"
                                style={{
                                    transform: `rotate(${pullDistance >= threshold ? 180 : 0}deg)`
                                }}
                            >
                                ↓
                            </div>
                            <span className="text-xs font-bold text-gray-500 mt-1">
                                {pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div
                style={{
                    transform: `translateY(${isPulling || isRefreshing ? pullDistance : 0}px)`,
                    transition: isPulling ? 'none' : 'transform 0.2s ease-out',
                }}
            >
                {children}
            </div>
        </div>
    );
}
