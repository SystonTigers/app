'use client';

import { useState, useEffect } from 'react';

interface WeatherData {
    temp: number;
    condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'partly-cloudy';
    description: string;
}

interface WeatherWidgetProps {
    location?: string;
    date?: Date | string;
    className?: string;
}

const WEATHER_ICONS: Record<WeatherData['condition'], string> = {
    'sunny': '☀️',
    'cloudy': '☁️',
    'rainy': '🌧️',
    'stormy': '⛈️',
    'snowy': '🌨️',
    'partly-cloudy': '⛅',
};

export function WeatherWidget({ location = 'Stadium', date, className = '' }: WeatherWidgetProps) {
    const [weather, setWeather] = useState<WeatherData | null>(null);

    useEffect(() => {
        // Mock weather data - in production, connect to a weather API
        const conditions: WeatherData['condition'][] = ['sunny', 'cloudy', 'rainy', 'partly-cloudy'];
        const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];

        const mockDescriptions: Record<WeatherData['condition'], string> = {
            'sunny': 'Clear skies',
            'cloudy': 'Overcast',
            'rainy': 'Light rain',
            'stormy': 'Thunderstorms',
            'snowy': 'Snow showers',
            'partly-cloudy': 'Partly cloudy',
        };

        setWeather({
            temp: Math.floor(Math.random() * 15) + 8, // 8-22°C
            condition: randomCondition,
            description: mockDescriptions[randomCondition],
        });
    }, [date]);

    if (!weather) return null;

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="text-3xl">{WEATHER_ICONS[weather.condition]}</div>
            <div>
                <div className="text-2xl font-black">{weather.temp}°C</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{weather.description}</div>
            </div>
        </div>
    );
}

// Compact inline version
export function WeatherWidgetInline({ className = '' }: { className?: string }) {
    const [weather, setWeather] = useState<WeatherData | null>(null);

    useEffect(() => {
        const conditions: WeatherData['condition'][] = ['sunny', 'cloudy', 'rainy', 'partly-cloudy'];
        const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];

        setWeather({
            temp: Math.floor(Math.random() * 15) + 8,
            condition: randomCondition,
            description: '',
        });
    }, []);

    if (!weather) return null;

    return (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
            <span>{WEATHER_ICONS[weather.condition]}</span>
            <span className="font-bold">{weather.temp}°</span>
        </span>
    );
}
