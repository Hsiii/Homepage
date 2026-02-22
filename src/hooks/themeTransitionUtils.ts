const midpoint = (
    pointA: { x: number; y: number },
    pointB: { x: number; y: number }
) => ({
    x: (pointA.x + pointB.x) / 2,
    y: (pointA.y + pointB.y) / 2,
});

export const createBlobPath = (
    centerX: number,
    centerY: number,
    radius: number,
    phase: number,
    wobbleStrength = 1
): string => {
    const pointCount = 10;
    const points = Array.from({ length: pointCount }, (_, index) => {
        const angle = (index / pointCount) * Math.PI * 2;
        const wobble =
            1 +
            wobbleStrength *
                (0.16 * Math.sin(angle * 3 + phase) +
                    0.1 * Math.sin(angle * 5 - phase * 0.7));

        return {
            x: centerX + Math.cos(angle) * radius * wobble,
            y: centerY + Math.sin(angle) * radius * wobble,
        };
    });

    const start = midpoint(points[pointCount - 1], points[0]);
    let path = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`;

    for (let i = 0; i < pointCount; i++) {
        const current = points[i];
        const next = points[(i + 1) % pointCount];
        const nextMidpoint = midpoint(current, next);
        path += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${nextMidpoint.x.toFixed(2)} ${nextMidpoint.y.toFixed(2)}`;
    }

    return `${path} Z`;
};
