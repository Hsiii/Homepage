import { useEffect, useState } from 'react';

interface Time {
    time: string;
}

export const useTime = (): Time => {
    const [time, setTime] = useState('');

    useEffect(() => {
        const update = () => {
            setTime(
                new Date().toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    hour12: false,
                    minute: '2-digit',
                })
            );
        };

        requestAnimationFrame(update);
        const id = setInterval(update, 1000 * 60);
        return () => {
            clearInterval(id);
        };
    }, []);

    return { time };
};
