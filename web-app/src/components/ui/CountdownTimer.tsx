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
            <p className={`font-display text-xl font-bold uppercase tracking-wider text-muted ${className}`}>
                It&apos;s kick-off time
            </p>
        );
    }

    if (!timeLeft) return null;

    const TimeBlock = ({ value, label }: { value: number; label: string }) => (
        <div className="flex flex-col items-center">
            <div className="bg-background border border-border chamfer-sm px-3 py-2 min-w-[56px] text-center">
                <span className="font-display text-3xl md:text-4xl font-extrabold tabular-nums">
                    {String(value).padStart(2, '0')}
                </span>
            </div>
            <span className="text-xs font-bold text-muted uppercase tracking-wider mt-1">{label}</span>
        </div>
    );

    return (
        <div className={`flex items-center gap-1.5 md:gap-3 ${className}`} role="timer" aria-label={`${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes to kick-off`}>
            {timeLeft.days > 0 && (
                <>
                    <TimeBlock value={timeLeft.days} label="Days" />
                    <span className="text-2xl font-bold text-muted pb-5" aria-hidden="true">:</span>
                </>
            )}
            <TimeBlock value={timeLeft.hours} label="Hours" />
            <span className="text-2xl font-bold text-muted pb-5" aria-hidden="true">:</span>
            <TimeBlock value={timeLeft.minutes} label="Mins" />
            <span className="text-2xl font-bold text-muted pb-5" aria-hidden="true">:</span>
            <TimeBlock value={timeLeft.seconds} label="Secs" />
        </div>
    );
}
