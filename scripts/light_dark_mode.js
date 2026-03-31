// To toggle light and dark mode
const toggleButton = document.getElementById('mode-toggle');

// On load, check saved mode in localStorage
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
} else {
    document.body.classList.remove('dark-mode');
}

toggleButton.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');

    // Save the current mode
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }

    // Redraw pulse
    if (window.drawPulse && window.pulseData && window.pulseCtx && window.pulseCanvas) {
        window.drawPulse(window.pulseCanvas, window.pulseCtx, window.pulseData);
    }

    // Redraw array
    if (window.drawArray && window.arrayCtx && window.arrayCanvas && window.generatePoints) {
        window.drawArray(window.arrayCanvas, window.arrayCtx, window.generatePoints(window.arrayCanvas));
    }

    // Redraw polygons
    if (window.updateOffscreenSize && window.renderStaticPolygons && window.polygonData) {
        window.updateOffscreenSize();
        window.renderStaticPolygons();
    }

    // Rebuild Path2D geometry
    if (window.rebuildPaths2D) {
        window.rebuildPaths2D();
    }

    // Redraw pulsars
    if (window.pulsars && window.drawPulsars) {
        window.drawPulsars();
    }

    // Redraw crosshair and hover box if cursor/finger is still active
    if (window.mouseX !== null && window.mouseY !== null) {
        // Redraw static polygons first
        const canvas_polygon = document.getElementById("map-polygon");
        if (canvas_polygon) {
            const ctx = canvas_polygon.getContext("2d");
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas_polygon.width, canvas_polygon.height);
            if (window.offscnCvs && window.polygonData) {
                ctx.drawImage(window.offscnCvs, 0, 0, canvas_polygon.width, canvas_polygon.height);
            }
            ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);

            // Repaint overlays
            if (window.drawCrosshair) window.drawCrosshair();
            if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                if (window.drawHoverBoxMobile) window.drawHoverBoxMobile();
            } else {
                if (window.drawHoverBox) window.drawHoverBox();
            }
        }
    }

    // Redraw help pan
    if (window.drawHelpPan) {
        window.drawHelpPan();
    }

    // Replay video
    if (window.playVideo) {
        window.playVideo();
    }
});

// Apply theme from localStorage on back/forward navigation
window.addEventListener('pageshow', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }

    // Redraw pulse
    if (window.drawPulse && window.pulseData && window.pulseCtx && window.pulseCanvas) {
        window.drawPulse(window.pulseCanvas, window.pulseCtx, window.pulseData);
    }

    // Redraw array
    if (window.drawArray && window.arrayCtx && window.arrayCanvas && window.generatePoints) {
        window.drawArray(window.arrayCanvas, window.arrayCtx, window.generatePoints(window.arrayCanvas));
    }

    // Redraw polygons
    if (window.updateOffscreenSize && window.renderStaticPolygons && window.polygonData) {
        window.updateOffscreenSize();
        window.renderStaticPolygons();
    }

    // Rebuild Path2D geometry
    if (window.rebuildPaths2D) {
        window.rebuildPaths2D();
    }

    // Redraw pulsars
    if (window.pulsars && window.drawPulsars) {
        window.drawPulsars();
    }

    // Redraw crosshair and hover box if cursor/finger is still active
    if (window.mouseX !== null && window.mouseY !== null) {
        // Redraw static polygons first
        const canvas_polygon = document.getElementById("map-polygon");
        if (canvas_polygon) {
            const ctx = canvas_polygon.getContext("2d");
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas_polygon.width, canvas_polygon.height);
            if (window.offscnCvs && window.polygonData) {
                ctx.drawImage(window.offscnCvs, 0, 0, canvas_polygon.width, canvas_polygon.height);
            }
            ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);

            // Repaint overlays
            if (window.drawCrosshair) window.drawCrosshair();
            if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                if (window.drawHoverBoxMobile) window.drawHoverBoxMobile();
            } else {
                if (window.drawHoverBox) window.drawHoverBox();
            }
        }
    }

    // Redraw help pan
    if (window.drawHelpPan) {
        window.drawHelpPan();
    }

    // Replay video
    if (window.playVideo) {
        window.playVideo();
    }
});
