import { useEffect, useState } from 'react';

interface Time {
    time: string;
}

export const useTime = (): Time => {
    const [time, setTime] = useState('');

    useEffect(() => {
        const update = () => {
            const d = new Date();
            const hours = d.getHours().toString().padStart(2, '0');
            const minutes = d.getMinutes().toString().padStart(2, '0');
            setTime(`${hours}:${minutes}`);
        };

        requestAnimationFrame(update);
        const id = setInterval(update, 1000 * 60);
        return () => {
            clearInterval(id);
        };
    }, []);

    return { time };
};
