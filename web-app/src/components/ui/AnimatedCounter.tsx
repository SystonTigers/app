'use client';

import { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    className?: string;
    prefix?: string;
    suffix?: string;
    decimals?: number;
}

export function AnimatedCounter({
    value,
    duration = 1500,
    className = '',
    prefix = '',
    suffix = '',
    decimals = 0,
}: AnimatedCounterProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);
    const hasAnimated = useRef(false);
    const elementRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        // Intersection Observer to trigger animation when visible
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasAnimated.current) {
                        hasAnimated.current = true;
                        startAnimation();
                    }
                });
            },
            { threshold: 0.1 }
        );

        if (elementRef.current) {
            observer.observe(elementRef.current);
        }

        return () => {
            observer.disconnect();
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [value]);

    const startAnimation = () => {
        const animate = (timestamp: number) => {
            if (!startTimeRef.current) {
                startTimeRef.current = timestamp;
            }

            const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);

            // Easing function (easeOutExpo)
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            setDisplayValue(eased * value);

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };

        rafRef.current = requestAnimationFrame(animate);
    };

    const formattedValue = decimals > 0
        ? displayValue.toFixed(decimals)
        : Math.round(displayValue).toLocaleString();

    return (
        <span ref={elementRef} className={className}>
            {prefix}{formattedValue}{suffix}
        </span>
    );
}
