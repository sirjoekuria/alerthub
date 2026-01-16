import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

export const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
    const [startPoint, setStartPoint] = useState<number>(0);
    const [pullChange, setPullChange] = useState<number>(0);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const pullDistance = 80;

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        const handleTouchStart = (e: TouchEvent) => {
            if (container.scrollTop === 0) {
                setStartPoint(e.touches[0].screenY);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (container.scrollTop === 0 && startPoint > 0) {
                const pull = e.touches[0].screenY - startPoint;
                if (pull > 0) {
                    // Prevent default only if we are pulling down at the top
                    // Note: preventDefault might interfere with scrolling if not careful
                    // mostly useful to prevent browser chrome refresh if desired, 
                    // but strictly checking scrollTop === 0 usually suffices.
                    setPullChange(pull);
                }
            }
        };

        const handleTouchEnd = async () => {
            if (pullChange > pullDistance) {
                setRefreshing(true);
                setPullChange(pullDistance); // Lock at max distance
                try {
                    await onRefresh();
                } finally {
                    setRefreshing(false);
                    setPullChange(0);
                    setStartPoint(0);
                }
            } else {
                setPullChange(0);
                setStartPoint(0);
            }
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [onRefresh, pullChange, startPoint]);

    return (
        <div
            ref={containerRef}
            className="h-full overflow-y-auto relative no-scrollbar"
            style={{
                overscrollBehaviorY: 'contain' // Prevents browser default pull-to-refresh
            }}
        >
            <div
                className="absolute top-0 w-full flex justify-center items-center pointer-events-none transition-all duration-200"
                style={{
                    height: refreshing ? `${pullDistance}px` : `${Math.min(pullChange, pullDistance)}px`,
                    opacity: Math.min(pullChange / pullDistance, 1),
                    zIndex: 10
                }}
            >
                <div className="bg-white rounded-full p-2 shadow-md">
                    <Loader2 className={`w-5 h-5 text-primary ${refreshing ? 'animate-spin' : ''}`}
                        style={{ transform: `rotate(${pullChange * 3}deg)` }}
                    />
                </div>
            </div>

            <div
                className="transition-transform duration-200 ease-out"
                style={{
                    transform: `translateY(${refreshing ? pullDistance : Math.min(pullChange / 2, pullDistance)}px)`
                }}
            >
                {children}
            </div>
        </div>
    );
};
