// Draw J0437 profile on canvas1
document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("canvas1");
    let ctx = setupHiDPICanvas(canvas);

    fetch("data/J0437.json")
    .then(response => response.json())
    .then(data => {
        let pulse = data.J0437.map(parseFloat);
        pulse = shiftArray(pulse, 50);

        let cancelAnim = null;

        canvas.addEventListener("mouseenter", () => {
            // Stop previous anim if any
            if (cancelAnim) cancelAnim();

            cancelAnim = animatePulse(canvas, ctx, pulse, 5000);
        });

        canvas.addEventListener("mouseleave", () => {
            if (cancelAnim) {
                cancelAnim();
                cancelAnim = null;
            }

            // Show static clean signal
            drawPulse(canvas, ctx, pulse);
        });

        canvas.addEventListener("click", () => {
            if (!justAnimated) {
                window.location.href = "pulsar.html";
            }
        });

        // On mobile long press to animate
        let justAnimated = false;
        let touchTimer = null;
        let longPressed = false;

        canvas.addEventListener("touchstart", (e) => {
            // Prevent accidental double triggers
            if (cancelAnim) cancelAnim();

            longPressed = false;

            // Start a timer for a 500ms long press threshold
            touchTimer = setTimeout(() => {
                cancelAnim = animatePulse(canvas, ctx, pulse, 5000);
                justAnimated = true;
                longPressed = true;
            }, 500);

            // Prevent default
            e.preventDefault();
        });

        canvas.addEventListener("touchend", () => {
            // If released early, cancel the timer before animation starts
            if (touchTimer) {
                clearTimeout(touchTimer);
                touchTimer = null;
            }

            // If the user didn't long press, it's a tap
            if (!longPressed && !justAnimated) {
                window.location.href = "pulsar.html";
                return;
            }

            // Stop animation and show static signal
            if (cancelAnim) {
                cancelAnim();
                cancelAnim = null;
                drawPulse(canvas, ctx, pulse);
            }

            // Prevent accidental click right after animation
            setTimeout(() => {
                justAnimated = false;
               longPressed = false;
            }, 300);
        });

        // Change cursor to hand when hovering
        canvas.style.cursor = "pointer";

        drawPulse(canvas, ctx, pulse);

        // Expose globals
        window.pulseData = pulse;
        window.pulseCanvas = canvas;
        window.pulseCtx = ctx;
        window.drawPulse = drawPulse;
        window.animatePulse = animatePulse;
        window.setupHiDPICanvas = setupHiDPICanvas;

        // Resize listener
        window.addEventListener("resize", () => {
            ctx = setupHiDPICanvas(canvas);
            drawPulse(canvas, ctx, pulse);
        });
    })
    .catch(err => console.error("Error loading .json", err));
});

function animatePulse(canvas, ctx, values, duration = 5000) {
    const start = performance.now();
    const n = values.length;
    let frameId;

    function frame(time) {
        const elapsed = time - start;
        let progress = elapsed / duration;
        if (progress > 1) progress = 1;

        // Generate noises
        const noises = generateNoise(n);

        // Mix pulse and noise
        const mixed = values.map((v, i) => (1 - progress) * noises[i] + progress * v);

        // Draw
        drawPulse(canvas, ctx, mixed);

        if (progress < 1) {
            frameId = requestAnimationFrame(frame);
        }
    }

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
}

function drawPulse(canvas, ctx, values) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Clear background
    ctx.clearRect(0, 0, w, h);

    // Find min/max to scale nicely
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    ctx.beginPath();
    values.forEach((val, i) => {
        const x = (i / (values.length - 1)) * w * 0.8 + 0.1 * w;
        const y = (1 - (val - minVal) / (maxVal - minVal)) * 0.8 * h + 0.1 * h;
        if (i == 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    const isDark = document.body.classList.contains("dark-mode");
    ctx.strokeStyle = isDark ? "white" : "black";
    ctx.lineWidth = Math.max(1, w * 0.03);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
}

function shiftArray(arr, shift) {
    const n = arr.length;
    const s = ((shift % n) + n) % n;
    return arr.slice(s).concat(arr.slice(0, s));
}

function generateNoise(n) {
    const noises = [];

    for (let i = 0; i < n; i++) {
        // Get standard gaussian random number with Box-Muller transform
        const theta = 2*Math.PI*Math.random();
        const rho = Math.sqrt(-2*Math.log(1 - Math.random()));
        const noise = rho*Math.cos(theta);

        noises.push(noise);
    }

    return noises;
}

function setupHiDPICanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Increase the internal pixel resolution
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    return ctx;
}
