'use client';

interface SkeletonProps {
    className?: string;
    variant?: 'default' | 'circular' | 'text' | 'card';
    width?: string | number;
    height?: string | number;
    lines?: number;
}

export function Skeleton({
    className = '',
    variant = 'default',
    width,
    height,
    lines = 1,
}: SkeletonProps) {
    const baseClass = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]';

    const variantClasses = {
        default: 'rounded-lg',
        circular: 'rounded-full',
        text: 'rounded h-4',
        card: 'rounded-2xl',
    };

    const style: React.CSSProperties = {
        width: width,
        height: height,
        animation: 'shimmer 1.5s infinite',
    };

    if (variant === 'text' && lines > 1) {
        return (
            <div className="space-y-2">
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className={`${baseClass} ${variantClasses.text} ${className}`}
                        style={{
                            ...style,
                            width: i === lines - 1 ? '70%' : '100%'
                        }}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={`${baseClass} ${variantClasses[variant]} ${className}`}
            style={style}
        />
    );
}

// Pre-built skeleton patterns
export function SkeletonCard() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
                <Skeleton variant="circular" width={48} height={48} />
                <div className="flex-1">
                    <Skeleton variant="text" className="mb-2" width="60%" />
                    <Skeleton variant="text" width="40%" />
                </div>
            </div>
            <Skeleton variant="text" lines={3} />
        </div>
    );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl">
                    <Skeleton variant="circular" width={40} height={40} />
                    <Skeleton variant="text" className="flex-1" />
                    <Skeleton width={60} height={24} />
                </div>
            ))}
        </div>
    );
}

export function SkeletonStats() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl text-center">
                    <Skeleton width={60} height={40} className="mx-auto mb-2" />
                    <Skeleton variant="text" width="80%" className="mx-auto" />
                </div>
            ))}
        </div>
    );
}
