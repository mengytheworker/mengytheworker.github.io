document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("canvas2");
    let ctx = window.setupHiDPICanvas(canvas);

    let cancelAnim = null;
    canvas.addEventListener("mouseenter", () => {
        if (cancelAnim) cancelAnim();
        cancelAnim = animateArray(canvas, ctx, 5000);
    });

    canvas.addEventListener("mouseleave", () => {
        if (cancelAnim) {
            cancelAnim();
            cancelAnim = null;
        }
        drawArray(canvas, ctx, generatePoints(canvas));
    });

    canvas.addEventListener("click", () => {
        if (!justAnimated) {
            window.location.href = "sky.html";
        }
    });

    // On mobile long press to animate
    let justAnimated = false;
    let touchTimer = null;
    let longPressed = false;

    canvas.addEventListener("touchstart", (e) => {
        if (cancelAnim) cancelAnim();

        longPressed = false;

        // Start a timer for long press (500ms)
        touchTimer = setTimeout(() => {
            cancelAnim = animateArray(canvas, ctx, 5000);
            justAnimated = true;
            longPressed = true;
        }, 500);

        e.preventDefault();
    });

    canvas.addEventListener("touchend", () => {
        // If released early, cancel the timer
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }

        // If the user didn't long press, it's a tap
        if (!longPressed && !justAnimated) {
            window.location.href = "sky.html";
            return;
        }

        // Stop animation and show static array
        if (cancelAnim) {
            cancelAnim();
            cancelAnim = null;
            drawArray(canvas, ctx, generatePoints(canvas));
        }

        // Prevent accidental click right after animation
        setTimeout(() => {
            justAnimated = false;
            longPressed = false;
        }, 300);
    });

    // Change cursor to hand when hovering
    canvas.style.cursor = "pointer";

    drawArray(canvas, ctx, generatePoints(canvas));

    // Expose globals
    window.arrayCanvas = canvas;
    window.arrayCtx = ctx;
    window.drawArray = drawArray;
    window.generatePoints = generatePoints;

    // Resize listener
    window.addEventListener("resize", () => {
        ctx = setupHiDPICanvas(canvas);
        drawArray(canvas, ctx, generatePoints(canvas));
    });
});

function generatePoints(canvas) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Radius from center
    const R = Math.min(w, h) / 2.1;
    const centerX = w / 2;
    const centerY = h / 2;

    const points = [];
    for (let i = 0; i < 5; i++) {
        // Ring radius
        const r = ((i + 0.5) / 5) * R;

        // Number of points in this ring
        const u = (i + 1) * 5;

        for (let j = 0; j < u; j++) {
            const angle = (360 / u) * j + (360 / u) / 2;
            const rad = (angle * Math.PI) / 180;

            points.push({
                x: centerX + r * Math.cos(rad),
                y: centerY + r * Math.sin(rad),
                alpha: 1.0 // default brightness
            });
        }
    }

    return points;
}

function drawArray(canvas, ctx, points) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    // Detect mobile
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const baseRadius = Math.max(1, w * 0.02);
    const pointRadius = isMobile ? baseRadius * 0.7 : baseRadius;

    // Detect mode
    const isDark = document.body.classList.contains("dark-mode");

    points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, pointRadius, 0, 2*Math.PI);

        if (p.tint !== undefined) {
            // Grayscale tint with alpha
            ctx.fillStyle = `rgba(${p.tint},${p.tint},${p.tint},${p.alpha})`;
        } else {
            ctx.fillStyle = isDark ? "white" : "black";
        }

        ctx.fill();
    });
}

function animateArray(canvas, ctx, duration=5000) {
    let points = generatePoints(canvas);
    const start = performance.now();
    let frameId;

    function frame(time) {
        const elapsed = time - start;
        let progress = elapsed / duration;
        if (progress > 1) progress = 1;

        // Every few frames, assign random tints
        if (Math.random() < 1) { // ~90% chance per frame
            const numTints = 5 + Math.floor(Math.random() * 5);
            for (let k = 0; k < numTints; k++) {
                const idx = Math.floor(Math.random() * points.length);
                points[idx].tint = Math.floor(Math.random() * 155 + 100); // gray 100-255
                points[idx].alpha = 0.8;
            }
        }

        // Fade existing tints
        points.forEach(p => {
            if (p.tint !== undefined) {
                p.alpha *= 0.8; // fade out
                if (p.alpha < 0.05) {
                    delete p.tint;
                    p.alpha = 1.0
                }
            }
        });

        drawArray(canvas, ctx, points);

        if (progress < 1) {
            frameId = requestAnimationFrame(frame);
        } else {
            // At the end, show the points without tints
            drawArray(canvas, ctx, generatePoints(canvas));
        }
    }

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
}