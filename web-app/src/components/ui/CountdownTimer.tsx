'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
    targetDate: Date | string;
    className?: string;
    onComplete?: () => void;
}

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

export function CountdownTimer({ targetDate, className = '', onComplete }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
            const now = new Date();
            const difference = target.getTime() - now.getTime();

            if (difference <= 0) {
                setIsComplete(true);
                onComplete?.();
                return null;
            }

            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        };

        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate, onComplete]);

    if (isComplete) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <span className="animate-pulse text-red-500 font-black">🔴 LIVE NOW</span>
            </div>
        );
    }

    if (!timeLeft) return null;

    const TimeBlock = ({ value, label }: { value: number; label: string }) => (
        <div className="flex flex-col items-center">
            <div className="bg-gray-900 dark:bg-black text-white px-3 py-2 rounded-xl min-w-[60px] text-center relative overflow-hidden">
                <span className="text-2xl md:text-3xl font-black font-mono tabular-nums">
                    {String(value).padStart(2, '0')}
                </span>
                <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{label}</span>
        </div>
    );

    return (
        <div className={`flex items-center gap-2 md:gap-3 ${className}`}>
            {timeLeft.days > 0 && (
                <>
                    <TimeBlock value={timeLeft.days} label="Days" />
                    <span className="text-2xl font-bold text-gray-400">:</span>
                </>
            )}
            <TimeBlock value={timeLeft.hours} label="Hours" />
            <span className="text-2xl font-bold text-gray-400">:</span>
            <TimeBlock value={timeLeft.minutes} label="Mins" />
            <span className="text-2xl font-bold text-gray-400">:</span>
            <TimeBlock value={timeLeft.seconds} label="Secs" />
        </div>
    );
}

// Compact version for smaller spaces
export function CountdownTimerCompact({ targetDate, className = '' }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
            const now = new Date();
            const difference = target.getTime() - now.getTime();

            if (difference <= 0) return null;

            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        };

        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    if (!timeLeft) {
        return <span className="text-red-500 font-bold animate-pulse">LIVE</span>;
    }

    if (timeLeft.days > 0) {
        return <span className={className}>{timeLeft.days}d {timeLeft.hours}h</span>;
    }

    return (
        <span className={`font-mono tabular-nums ${className}`}>
            {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </span>
    );
}
