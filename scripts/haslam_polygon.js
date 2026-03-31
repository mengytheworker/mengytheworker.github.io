// Draw the vector image (polygons) with the data in haslam_polygon_simplified.json

const canvas = document.getElementById("map-polygon");
const ctx = canvas.getContext("2d");
const dpr = window.devicePixelRatio || 1;

// Create offscreen buffer for the static polygons
const offscnCvs = document.createElement("canvas");
const offscnCtx = offscnCvs.getContext("2d");

// Store cursor's position
let mouseX = null;
let mouseY = null;

// Hover box size
let hoverBoxWidth, hoverBoxHeight;

// Help canvas
const helpCvs = document.getElementById('cvs-help');
const helpCtx = helpCvs ? helpCvs.getContext('2d') : null;

// Help box
const helpBox = document.getElementById('help-box');

// Initial sizing
resizeCanvas();
updateBoxSize();

// Fetch JSON
fetch("data/haslam_polygons_simplified.json")
.then(response => response.json())
.then(data => {
    // Expose
    window.polygonData = data;
    window.mouseX = mouseX;
    window.mouseY = mouseY;
    window.offscnCvs = offscnCvs;
    window.updateOffscreenSize = updateOffscreenSize;
    window.renderStaticPolygons = renderStaticPolygons;
    window.rebuildPaths2D = rebuildPaths2D;
    window.drawCrosshair = drawCrosshair;
    window.drawHoverBox = drawHoverBox;
    window.drawHoverBoxMobile = drawHoverBoxMobile;
    window.drawHelpPan = drawHelpPan;

    // Render static polygons
    updateOffscreenSize();
    renderStaticPolygons();

    // Cache paths for later temperature retrieval
    // Convert longitude/latitude degrees to canvas coordinates
    const toCanvasX = lon => lon / 360 * canvas.clientWidth * dpr;
    const toCanvasY = lat => (90 - lat) / 180 * canvas.clientHeight * dpr;

    for (const [levelKey, level] of Object.entries(data)) {
        level.paths2D = level.path.map(pathCoords => {
            const p = new Path2D();
            const [first, ...rest] = pathCoords;
            p.moveTo(toCanvasX(first[0]), toCanvasY(first[1]));
            for (const [x, y] of rest) p.lineTo(toCanvasX(x), toCanvasY(y));
            p.closePath();
            return p;
        });
    }

    // Draw help pan
    drawHelpPan();
});

function updateBoxSize() {
    const shortSide = Math.min(canvas.clientWidth, canvas.clientHeight);
    hoverBoxWidth = shortSide * 0.3;
    hoverBoxHeight = shortSide * 0.07;
}

function drawPolygons(data, context = ctx, cssWidth = canvas.clientWidth, cssHeight = canvas.clientHeight) {
    context.clearRect(0, 0, cssWidth, cssHeight);

    // Detect mode
    const isDark = document.body.classList.contains("dark-mode");

    // Convert longitude/latitude degrees to canvas coordinates
    const toCanvasX = lon => lon / 360 * cssWidth;
    const toCanvasY = lat => (90 - lat) / 180 * cssHeight;

    // Draw
    for (const level of Object.values(data)) {
        const color = level.color;
        const [r, g, b, a] = color;
        const inv = c => 1 - c;
        const fillColor = isDark ? `rgba(${inv(r)*255}, ${inv(g)*255}, ${inv(b)*255}, ${a})` : `rgba(${r*255}, ${g*255}, ${b*255}, ${a})`;

        context.fillStyle = fillColor;
        for (const path of level.path) {
            context.beginPath();
            const [first, ...rest] = path;
            context.moveTo(toCanvasX(first[0]), toCanvasY(first[1]));
            for (const [x, y] of rest) {
                context.lineTo(toCanvasX(x), toCanvasY(y));
            }
            context.closePath();
            context.fill();
        }
    }
}

function resizeCanvas() {
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function updateOffscreenSize() {
    // Keep offscreen in device pixels
    offscnCvs.width = canvas.clientWidth * dpr;
    offscnCvs.height = canvas.clientHeight * dpr;

    // Transform by dpr to draw polygons in CSS-pixel coordinates
    offscnCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function renderStaticPolygons() {
    if (!window.polygonData) return;

    // Match sizes
    offscnCvs.width = canvas.width;
    offscnCvs.height = canvas.height;

    // Draw the polygons only once
    offscnCtx.save();
    offscnCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPolygons(window.polygonData, offscnCtx);
    offscnCtx.restore();

    // Copy to visible canvas immediately
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscnCvs, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawCrosshair() {
    if (mouseX === null || mouseY === null) return;

    // Detect mode
    const isDark = document.body.classList.contains("dark-mode");

    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = isDark ? "white" : "black";

    ctx.beginPath();
    ctx.moveTo(0, mouseY);
    ctx.lineTo(canvas.clientWidth, mouseY); // horizontal line
    ctx.moveTo(mouseX, 0);
    ctx.lineTo(mouseX, canvas.clientHeight); // vertical line
    ctx.stroke();
    ctx.restore();
}

function colorForTemperature(v) {
    const vmin = 0.0;
    const vmax = 740.107;
    const vturn = 100.0;
    const gamma = 0.4;

    // Clamp value
    const vclamped = Math.max(Math.min(v, vmax), vmin);

    let r, g, b;
    if (vclamped < vturn) {
        const t = Math.pow((vclamped - vmin) / (vturn - vmin), gamma);

        const r1 = 1.0, g1 = 0.95, b1 = 0.9;
        const r2 = 1.0, g2 = 0.5, b2 = 0.0;

        r = (1 - t) * r1 + t * r2;
        g = (1 - t) * g1 + t * g2;
        b = (1 - t) * b1 + t * b2;
    } else {
        const t = Math.pow((vclamped - vturn) / (vmax - vturn), gamma);

        const r1 = 1.0, g1 = 0.5, b1 = 0.0;
        const r2 = 1.0, g2 = 0.0, b2 = 0.0;

        r = (1 - t) * r1 + t * r2;
        g = (1 - t) * g1 + t * g2;
        b = (1 - t) * b1 + t * b2;
    }

    return {
        rgb: [r, g, b],
        css: `rgb(${(r * 255).toFixed(0)}, ${(g * 255).toFixed(0)}, ${(b * 255).toFixed(0)})`
    };
}

function drawHoverBox() {
    if (mouseX === null || mouseY === null) return;

    const isDark = document.body.classList.contains("dark-mode");
    const boxColor = "rgba(255, 127, 0, 0.0)";
    const textColor = isDark ? "white" : "black";
    const tempColor = "rgb(255, 127, 0)";

    // Default position: upper left of the crosshair
    const gap = canvas.clientWidth * 0.006;
    let x = mouseX - hoverBoxWidth - gap;
    let y = mouseY - hoverBoxHeight - gap;

    // If box top ege would go above the canvas, flip it below
    if (y < 0) {
        y = mouseY + gap;
    }
    // If box left edge would go outside the canvas, flip to right side
    if (x < 0) {
        x = mouseX + gap;
    }
    // If box bottom edge exceeds canvas height, push upward
    if (y + hoverBoxHeight > canvas.clientHeight) {
        y = canvas.clientHeight - hoverBoxHeight - gap;
    }
    // If box right edge exceeds canvas width, push leftward
    if (x + hoverBoxWidth > canvas.clientWidth) {
        x = canvas.clientWidth - hoverBoxWidth - gap;
    }

    let lon = 180 - (mouseX / canvas.clientWidth * 360);
    if (lon < 0) lon += 360;
    const lat = 90 - mouseY / canvas.clientHeight * 180;

    // Estimate brightness temperature
    let temp = null;
    const px = mouseX * dpr;
    const py = mouseY * dpr;
    const tmpCtx = offscnCtx;
    const entries = Object.entries(window.polygonData).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
    for (const [levelKey, level] of entries) {
        for (const path of level.paths2D) {
            if (tmpCtx.isPointInPath(path, px, py)) {
                temp = parseFloat(levelKey) * 740.107 / 50; // 740.107 is highest temperature
                temp = temp.toFixed(1);
                break;
            }
        }
        if (temp !== null) break;
    }
    if (temp === null) temp = "-";

    ctx.save();
    if (temp === null) {
        ctx.fillStyle = boxColor;
    } else {
        const [r, g, b] = colorForTemperature(temp).rgb;
        const bgAlpha = isDark ? 0.25 : 0.15;
        ctx.fillStyle = `rgba(${(r * 255).toFixed(0)}, ${(g * 255).toFixed(0)}, ${(b * 255).toFixed(0)}, ${bgAlpha})`;
    }
    
    ctx.beginPath();
    ctx.roundRect(x, y, hoverBoxWidth, hoverBoxHeight, 0);
    ctx.fill();

    // Info text
    ctx.fillStyle = textColor;
    ctx.font = `100 ${Math.round(hoverBoxHeight * 0.17)}px monospace`;
    ctx.textBaseline = "top";
    ctx.fillText(`Galactic longitude (l): ${lon.toFixed(3)}°`, x + gap, y + gap);
    ctx.fillText(`Galactic latitude (b): ${lat.toFixed(3)}°`, x + gap, y + gap + hoverBoxHeight * 0.25);
    ctx.fillText(`Brightness temperature (T):`, x + gap, y + gap + hoverBoxHeight * 0.5);
    if (temp === null) {
        ctx.fillStyle = tempColor;
    } else {
        ctx.fillStyle = colorForTemperature(temp).css;
    }
    ctx.font = `bold ${Math.round(hoverBoxHeight * 0.17)}px monospace`;
    ctx.fillText(`${temp} K`, x + gap + ctx.measureText(`Brightness temperature (T):`).width + gap, y + gap + hoverBoxHeight * 0.5);

    ctx.restore();
}

function drawHoverBoxMobile() {
    if (mouseX === null || mouseY === null) return;

    const isDark = document.body.classList.contains("dark-mode");

    // Make the box slightly larger and offset further from finger
    const shortSide = Math.min(canvas.clientWidth, canvas.clientHeight);
    const mobileBoxWidth = shortSide * 0.6;
    const mobileBoxHeight = shortSide * 0.15;
    const gap = Math.max(canvas.clientWidth, canvas.clientHeight) * 0.04;
    let x = mouseX - mobileBoxWidth - gap;
    let y = mouseY - mobileBoxHeight - gap;

    if (y < 0) y = mouseY + gap;
    if (x < 0) x = mouseX + gap;
    if (y + mobileBoxHeight > canvas.clientHeight) y = canvas.clientHeight - mobileBoxHeight - gap;
    if (x + mobileBoxWidth > canvas.clientWidth) x = canvas.clientWidth - mobileBoxWidth - gap;

    // Convert coordinates
    let lon = 180 - (mouseX / canvas.clientWidth * 360);
    if (lon < 0) lon += 360;
    const lat = 90 - mouseY/ canvas.clientHeight * 180;

    // Estimate brightness temperature
    let temp = null;
    const px = mouseX * dpr;
    const py = mouseY * dpr;
    const tmpCtx = offscnCtx;
    const entries = Object.entries(window.polygonData).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
    for (const [levelKey, level] of entries) {
        for (const path of level.paths2D) {
            if (tmpCtx.isPointInPath(path, px, py)) {
                temp = parseFloat(levelKey) * 740.107 / 50; // 740.107 is highest temperature
                temp = temp.toFixed(1);
                break;
            }
        }
        if (temp !== null) break;
    }
    if (temp === null) temp = "-";

    // Colors
    const textColor = isDark ? "white" : "black";
    const { rgb, css } = colorForTemperature(parseFloat(temp));
    const [r, g, b] = rgb;
    const bgAlpha = isDark ? 0.3 : 0.2;
    const boxColor = `rgba(${(r * 255).toFixed(0)}, ${(g * 255).toFixed(0)}, ${(b * 255).toFixed(0)}, ${bgAlpha})`;

    // Draw box
    ctx.save();
    ctx.fillStyle = boxColor;
    ctx.beginPath();
    ctx.roundRect(x, y, mobileBoxWidth, mobileBoxHeight, 0);
    ctx.fill();

    // Draw text (larger)
    ctx.fillStyle = textColor;
    ctx.font = `100 ${Math.round(mobileBoxHeight * 0.18)}px monospace`;
    ctx.textBaseline = "top";
    ctx.fillText(`Galactic longitude (l): ${lon.toFixed(3)}°`, x + 5, y + 4);
    ctx.fillText(`Galactic latitude (b): ${lat.toFixed(3)}°`, x + 5, y + 4 + mobileBoxHeight * 0.29);
    ctx.fillStyle = css;
    ctx.font = `bold ${Math.round(mobileBoxHeight * 0.18)}px monospace`;
    ctx.fillText(`Brightness temperature (T):`, x + 5, y + 4 + mobileBoxHeight * 0.58);
    if (temp === null) {
        ctx.fillStyle = "rgb(255, 127, 0)";
    } else {
        ctx.fillStyle = css;
    }
    ctx.fillText(`${temp} K`, x + 5 + ctx.measureText(`Brightness temperature (T):`).width + 3, y + 4 + mobileBoxHeight * 0.58);
    ctx.restore();
}

// Draw help pan
function drawHelpPan() {
    // Detect mode
    const isDark = document.body.classList.contains("dark-mode");

    // Css size
    const cssSize = 20;

    helpCvs.width = cssSize * dpr;
    helpCvs.height = cssSize * dpr;
    helpCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    helpCtx.clearRect(0, 0, helpCvs.width, helpCvs.height);

    // Pan circle
    const r = cssSize / 2;
    helpCtx.beginPath();
    helpCtx.arc(r, r, r - 2, 0, 2*Math.PI);
    helpCtx.closePath();
    helpCtx.fillStyle = isDark ? "white" : "black";
    helpCtx.fill();
    
    // Question mark
    helpCtx.fillStyle = isDark ? "black" : "white";
    helpCtx.font = `${r * 0.9}px monospace`;
    helpCtx.textAlign = "center";
    helpCtx.textBaseline = "middle";
    helpCtx.fillText("?", r, r);

    // Position
    const rect = canvas.getBoundingClientRect();
    helpCvs.style.left = (rect.right - cssSize - 20) + "px";
    helpCvs.style.top = (rect.bottom - cssSize - 20) + "px";
}

// Events
function rebuildPaths2D() {
    if (!window.polygonData) return;

    // Reset transform
    offscnCtx.setTransform(1, 0, 0, 1, 0, 0);

    const toCanvasX = lon => lon / 360 * canvas.clientWidth;
    const toCanvasY = lat => (90 - lat) / 180 * canvas.clientHeight;

    for (const level of Object.values(window.polygonData)) {
        level.paths2D = level.path.map(pathCoords => {
            const p = new Path2D();
            const [first, ...rest] = pathCoords;
            p.moveTo(toCanvasX(first[0]), toCanvasY(first[1]));
            for (const [x, y] of rest) p.lineTo(toCanvasX(x), toCanvasY(y));
            p.closePath();
            return p;
        });
    }

    // Restore correct scaling for drawing
    offscnCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// Resize window
let resizeTimeout;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {
        resizeCanvas();
        updateOffscreenSize();
        updateBoxSize();
    
        if (window.polygonData) {
            // Rebuild cached Path2D geometry for new canvas size
            rebuildPaths2D();

            // Redraw polygons into offscreen buffer
            drawPolygons(window.polygonData, offscnCtx, canvas.clientWidth, canvas.clientHeight);

            // Copy to visible canvas immediately
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(offscnCvs, 0, 0, canvas.width, canvas.height);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        drawHelpPan();
    }, 200);
});

// Scroll window
window.addEventListener("scroll", () => {
    rebuildPaths2D();
    drawHelpPan();
});

// Mouse move event
canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;

    // 1) Draw the offscreen bitmap to the visible canvas.
    // Set transform identity so drawImage coordinates are device-pixel-accurate,
    // then draw the offscreen (which is sized in device pixels).
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // drawImage uses device-pixel canvas sizes: draw full source to full dest
    ctx.drawImage(offscnCvs, 0, 0, canvas.width, canvas.height);

    // 2) Restore transform to CSS pixel coordinates so crosshair uses CSS px positions
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Draw crosshair (uses CSS coords mouseX/mouseY)
    drawCrosshair();

    // Draw hover box
    if (window.innerWidth < 700) {
        drawHoverBoxMobile();
    } else {
        drawHoverBox();
    }
});

// Hide crosshair when cursor leaves
canvas.addEventListener("mouseleave", () => {
    mouseX = null;
    mouseY = null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscnCvs, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
});

// Touch start: show hover box immediately
function handleTouchMove() {
    // 1) Draw the offscreen bitmap to the visible canvas.
    // Set transform identity so drawImage coordinates are device-pixel-accurate,
    // then draw the offscreen (which is sized in device pixels).
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // drawImage uses device-pixel canvas sizes: draw full source to full dest
    ctx.drawImage(offscnCvs, 0, 0, canvas.width, canvas.height);

    // 2) Restore transform to CSS pixel coordinates so crosshair uses CSS px positions
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Draw crosshair (uses CSS coords mouseX/mouseY)
    drawCrosshair();

    // Draw hover box
    drawHoverBoxMobile();
}

canvas.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    if (!touch) return;

    const rect = canvas.getBoundingClientRect();
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;

    handleTouchMove();
    event.preventDefault();
});

// Touch move: update position continuously
canvas.addEventListener("touchmove", (event) => {
    const touch = event.touches[0];
    if (!touch) return;

    const rect = canvas.getBoundingClientRect();
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;

    handleTouchMove();
    event.preventDefault();
});

// Touch end: hide box
canvas.addEventListener("touchend", () => {
    mouseX = null;
    mouseY = null;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscnCvs, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
});

// Help canvas mouse enter
helpCvs.addEventListener('mouseenter', () => {
    const helpRect = helpCvs.getBoundingClientRect();
    const isDark = document.body.classList.contains("dark-mode");

    helpBox.textContent = 
    "Notes:\n\n" + 
    "· The map is under the galactic coordinate system. If you're not familiar with the coordinate system, think this way: the Milky Way is a flat disk, like a giant spinning pancake; the north side means if you look downward at the 'pancake' and the 'pancake' spins counterclockwise; now imagine floating at the center of the Sun, facing the Milky Way's center, with your head toward the north side; straight ahead is galactic longitude 0°; turn left around the galactic disk and longitude increases through 90°, 180° and back to 360°; then look upward the latitude rises to +90°, look downward the latitude falls to −90°.\n\n" + 
    "· The 408MHz all-sky survey was carried out jointly by the Effelsberg, the Jodrell Bank and the Parkes observatories from 1960s to 1970s studying the sky's brightness temperature at the frequency of 408MHz.\n\n" + 
    "· To characterize 'brightness', we see 'brightness' as being from the blackbody radiation, the derived temperature is the 'brightness temperature.'\n\n" + 
    "· A 'blackbody' is an ideal object that absorbs all light falling onto it — nothing is reflected, so it is perfectly dark. Yet this perfect darkness is not silent — when heated, a blackbody glows. As its temperature rises, the glow changes from red to yellow and then bluish white. This glow is called 'blackbody radiation'. The important idea is that the color and brightness depend only on temperature. That is why astrophysicists use the blackbody radiation to understand the stars, galaxies and even the sky itself. A cool or cold blackbody still radiates — but not in visible light. Instead, it gives off invisible light: first infrared, and at even lower temperatures, radio wave. (At such low frequencies, we usually say 'radio waves' rather than 'radio light'.) This is why temperature can also be measured at radio frequencies, such as 408MHz — this way radio astronomers describe the strength of the sky's radio emission.\n\n" + 
    "· Under radiative theory, a light source's 'brightness' or 'specific intensity' is the energy emitted per unit area per unit time per unit solid angle per unit frequency range. For an observation to the sky's brightness, a light source is a little patch of the sky extended by the beam size of the telescope employed.";

    if (window.innerWidth < 700) {
        helpBox.style.left = (helpRect.left - 430) + "px";
        helpBox.style.top = (helpRect.top - 270) + "px"
    } else {
        helpBox.style.left = (helpRect.left - 680) + "px";
        helpBox.style.top = (helpRect.top - 550) + "px"
    }

    helpBox.style.background = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)';
    helpBox.style.color = isDark ? 'white' : 'black';

    helpBox.style.display = 'block';
});

helpCvs.addEventListener("mouseleave", () => {
    helpBox.style.display = 'none';
});

helpCvs.addEventListener("touchstart", (event) => {
    // Ignore multi-touch
    if (event.touches.length !== 1) return;
    event.preventDefault();

    const helpRect = helpCvs.getBoundingClientRect();
    const isDark = document.body.classList.contains("dark-mode");

    helpBox.textContent = 
    "Notes:\n\n" + 
    "· The map is under the galactic coordinate system. If you're not familiar with the coordinate system, think this way: the Milky Way is a flat disk, like a giant spinning pancake; the north side means if you look downward at the 'pancake' and the 'pancake' spins counterclockwise; now imagine floating at the center of the Sun, facing the Milky Way's center, with your head toward the north side; straight ahead is galactic longitude 0°; turn left around the galactic disk and longitude increases through 90°, 180° and back to 360°; then look upward the latitude rises to +90°, look downward the latitude falls to −90°.\n\n" + 
    "· The 408MHz all-sky survey was carried out jointly by the Effelsberg, the Jodrell Bank and the Parkes observatories from 1960s to 1970s studying the sky's brightness temperature at the frequency of 408MHz.\n\n" + 
    "· To characterize 'brightness', we see 'brightness' as being from the blackbody radiation, the derived temperature is the 'brightness temperature.'\n\n" + 
    "· A 'blackbody' is an ideal object that absorbs all light falling onto it — nothing is reflected, so it is perfectly dark. Yet this perfect darkness is not silent — when heated, a blackbody glows. As its temperature rises, the glow changes from red to yellow and then bluish white. This glow is called 'blackbody radiation'. The important idea is that the color and brightness depend only on temperature. That is why astrophysicists use the blackbody radiation to understand the stars, galaxies and even the sky itself. A cool or cold blackbody still radiates — but not in visible light. Instead, it gives off invisible light: first infrared, and at even lower temperatures, radio wave. (At such low frequencies, we usually say 'radio waves' rather than 'radio light'.) This is why temperature can also be measured at radio frequencies, such as 408MHz — this way radio astronomers describe the strength of the sky's radio emission.\n\n" + 
    "· Under radiative theory, a light source's 'brightness' or 'specific intensity' is the energy emitted per unit area per unit time per unit solid angle per unit frequency range. For an observation to the sky's brightness, a light source is a little patch of the sky extended by the beam size of the telescope employed.";

    if (window.innerHeight > window.innerWidth) {
        // Portrait orientation
        helpBox.style.left = (helpRect.left - 300) + "px";
        helpBox.style.top = (helpRect.top - 120) + "px";
        helpBox.style.minWidth = '250px';
        helpBox.style.maxWidth = '270px';
        helpBox.style.minHeight = '550px';
        helpBox.style.maxHeight = '570px';
    } else {
        // Landscape orientation
        helpBox.style.left = (helpRect.left - 700) + "px";
        helpBox.style.top = (helpRect.top - 270) + "px";
        helpBox.style.minWidth = '650px';
        helpBox.style.maxWidth = '670px';
        helpBox.style.minHeight = '280px';
        helpBox.style.maxHeight = '300px';
    }

    helpBox.style.background = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)';
    helpBox.style.color = isDark ? 'white' : 'black';

    helpBox.style.display = 'block';
});

helpCvs.addEventListener("touchend", () => {
    helpBox.style.display = 'none';
});

// When leaving the page, release all exposed
window.addEventListener('pagehide', () => {
    window.polygonData = null;
    window.mouseX = null;
    window.mouseY = null;
    window.offscnCvs = null;
    window.updateOffscreenSize = null;
    window.renderStaticPolygons = null;
    window.rebuildPaths2D = null;
    window.drawCrosshair = null;
    window.drawHoverBox = null;
    window.drawHoverBoxMobile = null;
    window.drawHelpPan = null;
});
