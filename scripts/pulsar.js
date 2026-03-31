/*
    Draw pulsars on the pulsar canvas
    23/10/2025 -- Initialization
 */

const DB_NAME = 'pcat';
const DB_PULSAR_STORE = 'pulsars';
const DB_VERSION = 1;

// Make db global
let db;

// Dictionary array to store pulsar parameters for plotting
const pulsars = []

// Canvas and context for drawing
const canvas = document.getElementById('map-pulsar');
const ctx = canvas ? canvas.getContext('2d') : null;
const dpr = window.devicePixelRatio || 1;

// Offscreen canvas for buffering
let offscnCvs = null;
let offscnCtx = null;

// Help canvas
const helpCvs = document.getElementById('cvs-help');
const helpCtx = helpCvs ? helpCvs.getContext('2d') : null; 

// Help box
const helpBox = document.getElementById('help-box');

// Store cursor's position
let mouseX = null;
let mouseY = null;

// Boundaries in view
let viewLMin = 0;
let viewLMax = 360;
let viewBMin = -90;
let viewBMax = 90;
let viewLLeft = 180;
let viewLRight = 180;
let viewXMin = 0;
let viewXMax = 0;

// If passed l=0/360 line
let passedMidLine = false;
let midLineR = 0;

// If zoomed in
let isZoomed = false;

// For mouse dragging
let isDragging = false;
let dragStart = null;
let dragEnd = null;

// Cancel pulse animation
let cancelPulseAnim = null;

// Touch timer
let touchTimer = null;

// If touch selecting
let isTouchSelect = false;

// Touch coordinates
let initTouchX = 0, initTouchY = 0;
let thisTouchX = 0, thisTouchY = 0;

// Last tap time
let lastTapTime = 0;

// Setup canvases if available
if (canvas && ctx) {
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    viewXMin = 0;
    viewXMax = canvas.clientWidth;
    midLineR = 0.5;

    offscnCvs = document.createElement('canvas');
    offscnCtx = offscnCvs.getContext('2d');
    updateOffscreenSize();

    drawHelpPan();
}

// Update offscreen canvas size to match visible canvas
function updateOffscreenSize() {
    if (!canvas || !offscnCvs || !offscnCtx) return;

    // Keep offscreen in device pixels
    offscnCvs.width = canvas.clientWidth * dpr;
    offscnCvs.height = canvas.clientHeight * dpr;

    // Transform by dpr to draw in CSS-pixel coordinates
    offscnCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

// Fetch pcat3.json
fetch(new Request('data/pcat3.json'))
.then((response) => {
    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }
    return response.json();
})
.then((pcat) => {
    // Open indexedDB
    openDb(pcat);
})
.catch((error) => fetchError(error));

// Handle fetch error
function fetchError(error) {
    // Remove the map title and canvas if they exist
    const mapTitle = document.querySelector('.map-title');
    const mapCanvas = document.getElementById('map-pulsar');
    if (mapTitle) mapTitle.remove();
    if (mapCanvas) mapCanvas.remove();

    // Create a container for error messages
    const container = document.createElement('div');
    container.style.textAlign = 'center';
    container.style.marginTop = '2em';
    container.style.fontFamily = 'monospace';
    document.body.appendChild(container);

    const para1 = document.createElement('p');
    para1.textContent = `${error.message} - Failed in fetching JSON.`;
    para1.style.fontSize = '0.6em';
    para1.style.lineHeight = '2em';
    container.appendChild(para1);

    const para2 = document.createElement('p');
    para2.textContent = 'If you keep seeing this and are sure your internet connection is good,';
    para2.style.fontSize = '0.5em';
    para2.style.lineHeight = '1em';
    container.appendChild(para2);
    
    const para3 = document.createElement('p');
    para3.innerHTML = 'then please let me know: <font color="#007aff">vela.yumeng@gmail.com</font>.';
    para3.style.fontSize = '0.5em';
    para3.style.lineHeight = '1em';
    container.appendChild(para3);
}

// Read json to indexedDB if fetch ok
function openDb(pcat) {
    // Request to open
    const openDbRequest = indexedDB.open(DB_NAME, DB_VERSION);

    openDbRequest.onerror = function (event) {
        console.log('Open db error:', event.target.errorCode);

        // Remove the map title and canvas if they exist
        const mapTitle = document.querySelector('.map-title');
        const mapCanvas = document.getElementById('map-pulsar');
        if (mapTitle) mapTitle.remove();
        if (mapCanvas) mapCanvas.remove();

        // Create a container for error messages
        const container = document.createElement('div');
        container.style.textAlign = 'center';
        container.style.marginTop = '2em';
        container.style.fontFamily = 'monospace';
        document.body.appendChild(container);

        // Also Inform user
        const para1 = document.createElement('p');
        para1.textContent = `Database open error: ${event.target.errorCode}`;
        para1.style.fontSize = '0.6em';
        para1.style.lineHeight = '2em';
        container.appendChild(para1);

        const para2 = document.createElement('p');
        para2.innerHTML = 'If you keep seeing this are sure you have enabled indexedDB, ';
        para2.style.fontSize = '0.5em';
        para2.style.lineHeight = '1em';
        container.appendChild(para2);
    
        const para3 = document.createElement('p');
        para3.innerHTML = 'then please let me know: <font color="#007aff">vela.yumeng@gmail.com</font>.';
        para3.style.fontSize = '0.5em';
        para3.style.lineHeight = '1em';
        container.appendChild(para3);
    };

    openDbRequest.onsuccess = function (event) {
        db = event.target.result;

        // Retrieve pulsar object store
        const pulsarStore = db.transaction(DB_PULSAR_STORE, 'readwrite').objectStore(DB_PULSAR_STORE);
        
        // Write
        pcat.forEach((pulsar) => {
            pulsarStore.add(pulsar);
        });
        
        readStore(pulsarStore);
    };

    openDbRequest.onupgradeneeded = function (event) {
        // Create pulsar object store
        event.target.result.createObjectStore(DB_PULSAR_STORE, { keyPath: 'jname' });
    };
}

// Read store if it is successfully written
function readStore(store) {
    // Use cursor
    store.openCursor().onsuccess = function (event) {
        const cursor = event.target.result;

        if (cursor) {
            const pulsar = {}
            if ('jname' in cursor.value) pulsar.jname = cursor.value.jname;
            if ('gl' in cursor.value) pulsar.gl = cursor.value.gl;
            if ('gb' in cursor.value) pulsar.gb = cursor.value.gb;
            if ('p0' in cursor.value) pulsar.p0 = cursor.value.p0;
            if ('dist' in cursor.value) pulsar.dist = cursor.value.dist;
            if ('mu_l_star' in cursor.value) pulsar.mu_l_star = cursor.value.mu_l_star;
            if ('mu_b' in cursor.value) pulsar.mu_b = cursor.value.mu_b;

            // Add to array
            pulsars.push(pulsar);

            // Move to the next record
            cursor.continue();
        } else {
            // Draw after all pulsars are read
            if (canvas && ctx) {
                drawPulsars();

                // Expose
                window.pulsars = pulsars;
                window.drawPulsars = drawPulsars;
                window.drawHelpPan = drawHelpPan;
            }
        }
    };

    store.openCursor().onerror = function (event) {
        console.error('Error reading store: ', event.target.error);
    };
}

// Draw all pulsars to offscreen, then copy to visible canvas
function drawPulsars() {
    if (!offscnCvs || !offscnCtx || !canvas || !ctx) return;

    // Detect mode
    const isDark = document.body.classList.contains("dark-mode");

    // Clear offscreen etc.
    offscnCtx.clearRect(0, 0, offscnCvs.width / dpr, offscnCvs.height / dpr);
    offscnCtx.save();
    offscnCtx.lineWidth = 1 / dpr;

    // Find min/max of dist and max of mu
    let distMin = 1000;
    let distMax = 0;
    let muLMax = 0;
    let muBMax = 0;
    for (const pulsar of pulsars) {
        const d = Number(pulsar.dist);
        if (d < distMin) distMin = d;
        if (d > distMax) distMax = d;

        if ('mu_l_star' in pulsar && 'mu_b' in pulsar) {
            const mu_l_star = Number(pulsar.mu_l_star);
            const mu_b = Number(pulsar.mu_b);

            if (mu_l_star > muLMax) muLMax = mu_l_star;
            if (mu_b > muBMax) muBMax = mu_b;
        }
    }

    // For logarithmic scaling
    const logDMin = Math.log10(distMin);
    const logDMax = Math.log10(distMax);
    const muMax = Math.max(muLMax, muBMax);
    const muMin = 0.1; // avoid log(0);
    const logMuMin = Math.log10(muMin);
    const logMuMax = Math.log10(muMax);
    
    // Draw
    for (const pulsar of pulsars) {
        const l = Number(pulsar.gl);
        const b = Number(pulsar.gb);
        const p = Number(pulsar.p0);
        const d = Number(pulsar.dist);
        let [x, y] = toCanvasXY(l, b, canvas);

        // Set stroke color
        if (p < 0.01) {
            offscnCtx.strokeStyle = '#007aff';
        } else {
            offscnCtx.strokeStyle = isDark ? 'white' : 'black';
        }

        // Draw circle for pulsar position and distance
        // Calculate logarithmic scaling for radius
        let t_r = 0.0;
        if (d && d > 0) {
            const logD = Math.log10(d);
            t_r = (logD - logDMin) / (logDMax - logDMin);
            t_r = Math.max(0, Math.min(1, t_r));
        }
        const R = canvas.clientWidth * 0.004;
        const r = Math.max(1.5, R * (1.5 - t_r));

        offscnCtx.beginPath();
        offscnCtx.arc(x, y, r, 0, 2*Math.PI);
        offscnCtx.closePath();
        offscnCtx.stroke();

        // Draw line for proper motion
        if ('mu_l_star' in pulsar && 'mu_b' in pulsar) {
            const mu_l_star = Number(pulsar.mu_l_star);
            const mu_b = Number(pulsar.mu_b);

            // Combine the two components into a magnitude
            const mu_mag = Math.sqrt(mu_l_star * mu_l_star + mu_b * mu_b);

            // Normalize logarithmically
            let logMu = mu_mag > 0 ? Math.log10(mu_mag) : logMuMin;
            logMu = Math.max(logMuMin, Math.min(logMuMax, logMu));
            const t_mu = (logMu - logMuMin) / (logMuMax - logMuMin);

            // Max line length
            const Length = canvas.clientWidth * 0.02;
        
            // Line vector
            // mu_l_star increases toward decreasing x (since l increases leftward), we flip its sign for visual consistency.
            const dx = -(mu_l_star / mu_mag) * Length * (0.1 + 0.9 * Math.pow(t_mu, 1.8));
            // negative since canvas y increases downward
            const dy = -(mu_b / mu_mag) * Length * (0.1 + 0.9 * Math.pow(t_mu, 1.8));

            // Draw line indicating proper motion direction
            if (mu_mag > 0) {
                offscnCtx.beginPath();
                offscnCtx.moveTo(x, y);
                offscnCtx.lineTo(x + dx, y + dy);
                offscnCtx.closePath();
                offscnCtx.stroke();
            }
        }
    }
    // tmp begin
    //[x, y] = toCanvasXY(43.021, 0.766, canvas);
    //offscnCtx.beginPath();
    //offscnCtx.arc(x, y, 8, 0, 2*Math.PI);
    //offscnCtx.strokeStyle = 'red';
    //offscnCtx.lineWidth = 2;
    //offscnCtx.stroke();
    // tmp end
    offscnCtx.restore();

    // Copy to visible canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscnCvs, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// Convert Galactic coordinates l, b to canvas x, y
// l = 0 at center, increases leftward, l = 180 at both left and right edges, l = 360 wraps to center
// b = -90 degree at bottom, gb = +90 degree at top
function toCanvasXY(l, b, cvs) {
    // Use canvas client size (CSS pixels) for conversion
    const w = cvs.clientWidth || cvs.width;
    const h = cvs.clientHeight || cvs.height;

    // Find mid-line x
    const midLineX = midLineR * w;

    // Find x, y
    let x, y;
    if (isZoomed == false) {
        if (l > 0 && l < 180) {
            x = (1 - l / 180) * w / 2;
            y = (90 - b) / 180 * h;

            return [x, y];
        } else {
            x = (180 - l) / 180 * (w / 2) + w;
            y = (90 - b) / 180 * h;

            return [x, y];
        }
    } else {
        const l1 = viewLMin;
        const l2 = viewLMax;
        const b1 = viewBMin;
        const b2 = viewBMax;

        if (passedMidLine == true) {
            if (l > 0 && l < 180) {
                // If outside the bounds, then ignore
                if (l > l1 || b < b1 || b > b2) {
                    return [9999, 9999];
                }

                // Inside the bounds, plot
                x = (1 - l / l1) * midLineX;
                y = (b - b2) / (b1 - b2) * h;

                return [x, y];
            } else {
                // If outside the bounds, then ignore
                if (l < l2 || b < b1 || b > b2) {
                    return [9999, 9999];
                }

                // Inside the bounds, plot
                x = (l - l2) / (l2 - 360) * (w - midLineX) + w;
                y = (b - b2) / (b1 - b2) * h;

                return [x, y];
            }
        } else {
            // If ouside the bounds, then ignore
            if (l < l1 || l > l2 || b < b1 || b > b2) {
                return [9999, 9999];
            }

            // Inside the bounds, plot
            x = (l - l2) / (l1 - l2) * w;
            y = (b - b2) / (b1 - b2) * h;

            return [x, y];
        }
    }
}

// Convert canvas x, y to Galactic l, b
function toGalacticXY(x, y, cvs) {
    const w = cvs.clientWidth || cvs.width;
    const h = cvs.clientHeight || cvs.height;

    const midLineX = midLineR * w;

    const b1 = viewBMin;
    const b2 = viewBMax;
    const l1 = viewLLeft;
    const l2 = viewLRight;

    // Find b
    const b = (b1 - b2) / h * y + b2;

    // Find l
    if (!isZoomed) {
        if (x < midLineX) {
            const l = l1 * (1 - x / midLineX);

            return [l, b]; 
        } else {
            const l = (360 - l2) / (midLineX - w) * (x - w) + l2;

            return [l, b];
        }
    }

    if (passedMidLine == true) {
        if (x < midLineX) {
            const l = l1 * (1 - x / midLineX);

            return [l, b]; 
        } else {
            const l = (360 - l2) / (midLineX - w) * (x - w) + l2;

            return [l, b];
        }
    } else {
        if (viewXMax < midLineX) {
            const l = l1 * (1 - x / midLineX);

            return [l, b];
        } else if (viewXMin > midLineX) {
            const l = (l2 - 360) / (w - midLineX) * (x - w) + l2;

            return [l, b];
        }
    }
}

// Draw cross hair
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

// Events
// When leaving the page,
window.addEventListener('pagehide', () => {
    // free the IndexedDB
    if (db) {
        db.close();
        indexedDB.deleteDatabase(DB_NAME);
    }

    // release all exposed
    window.pulsars = null;
    window.drawPulsars = null;
    window.drawHelpPan = null;
});

// Redraw pulsars on resize
let resizeTimeout;
if (canvas) {
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Update canvas pixel size
            canvas.width = canvas.clientWidth * dpr;
            canvas.height = canvas.clientHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            updateOffscreenSize();
            drawPulsars();
            drawHelpPan();
        }, 200);
    });
}

// Draw hover box
function drawHoverBox() {
    if (mouseX === null || mouseY === null) return;

    const isDark = document.body.classList.contains("dark-mode");
    // Use canvas client size (CSS pixels) for conversion
    const w = canvas.clientWidth || canvas.width;
    const h = canvas.clientHeight || canvas.height;

    // Hover box size
    const shortSide = Math.min(canvas.clientWidth, canvas.clientHeight);
    let hoverBoxWidth, hoverBoxHeight, gap;

    // Nearest pulsar and minimum distance
    let nearest = null;
    let minDist = Infinity;

    // Distance threshold (in pixels)
    const distThreshold = 12;
    
    // Find nearest pulsar
    for (const pulsar of pulsars) {
        if (!pulsar.gl || !pulsar.gb) continue;

        // Find pulsar coordinate on canvas
        const [l, b] = [pulsar.gl, pulsar.gb];
        let px, py;
        if (!isZoomed) {
            if (l > 0 && l < 180) {
                px = (1 - l / 180) * w / 2;
                py = (90 - b) / 180 * h;
            } else {
                px = (180 - l) / 180 * (w / 2) + w;
                py = (90 - b) / 180 * h;
            }
        } else {
            const l1 = viewLMin;
            const l2 = viewLMax;
            const b1 = viewBMin;
            const b2 = viewBMax;
            const midLineX = midLineR * w;

            if (passedMidLine == true) {
                if (l > 0 && l < 180) {
                    // If outside the bounds, then ignore
                    if (l > l1 || b < b1 || b > b2) continue;

                    // Inside the bounds, plot
                    px = (1 - l / l1) * midLineX;
                    py = (b - b2) / (b1 - b2) * h;
                } else {
                    // If outside the bounds, then ignore
                    if (l < l2 || b < b1 || b > b2) continue;

                    // Inside the bounds, plot
                    px = (l - l2) / (l2 - 360) * (w - midLineX) + w;
                    py = (b - b2) / (b1 - b2) * h;
                }
            } else {
                // If ouside the bounds, then ignore
                if (l < l1 || l > l2 || b < b1 || b > b2) continue;

                // Inside the bounds, plot
                px = (l - l2) / (l1 - l2) * w;
                py = (b - b2) / (b1 - b2) * h;
            }
        }
        if (!isFinite(px) || !isFinite(py) || px < 0 || px > w || py < 0 || py > h) continue;

        // Distance between mouse and pulsar
        const dist = Math.sqrt((mouseX-px)*(mouseX-px)+(mouseY-py)*(mouseY-py));

        if (dist < minDist) {
            nearest = pulsar;
            minDist = dist;
        }
    }

    if (minDist < distThreshold) {
        // Retrieve pulsar object store
        const pulsarStore = db.transaction(DB_PULSAR_STORE, 'readonly').objectStore(DB_PULSAR_STORE);

        // Retrieve the nearest pulsar
        const request = pulsarStore.get(nearest.jname);
        request.onsuccess = () => {
            // Hover box size
            hoverBoxWidth = shortSide * 0.5;
            hoverBoxHeight = shortSide * 0.18;
            gap = shortSide * 0.01;
            const pulseCvsWidth = shortSide * 0.2;

            // Default position: upper left of the crosshair
            let x = mouseX - hoverBoxWidth - gap;
            let y = mouseY - hoverBoxHeight - gap;

            // If box top edge would go above the canvas, flip it below
            if (y < 0) {
                y = mouseY + gap;
            }
            // If box left edge would go outside the canvas, flip to right side
            if (request.result.profile) {
                if (x - pulseCvsWidth < 0) {
                    x = mouseX + gap + pulseCvsWidth;
                }
            } else {
                if (x < 0) {
                    x = mouseX + gap;
                }
            }
            // If box bottom edge exceeds canvas height, push upward
            if (y + hoverBoxHeight > h) {
                y = h - hoverBoxHeight - gap;
            }
            // If box right edge exceeds canvas width, push leftward
            if (x + hoverBoxWidth > w) {
                x = w - hoverBoxWidth - gap;
            }

            // Draw hover box
            ctx.save();
            ctx.strokeStyle = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(240, 240, 240, 0.7)';
            ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(240, 240, 240, 0.7)';
            ctx.strokeStyle = 1;

            ctx.beginPath();
            ctx.roundRect(x, y, hoverBoxWidth, hoverBoxHeight, 0);
            ctx.fill();
            ctx.closePath();

            // If profile exists, draw box for drawing profile
            if (request.result.profile) {
                const pulseCvs = document.getElementById('cvs-pulse');
                const pulseCtx = pulseCvs.getContext('2d');
                
                // Position pulse canvas
                const rect = canvas.getBoundingClientRect();
                pulseCvs.style.left = rect.left + window.scrollX + x - pulseCvsWidth + 'px';
                pulseCvs.style.top = rect.top + window.scrollY + y + 'px';
                pulseCvs.style.width = pulseCvsWidth + 'px';
                pulseCvs.style.height = hoverBoxHeight + 'px';

                // Background
                pulseCvs.style.background = isDark ? `rgba(0, 0, 0, 0.6)` : `rgba(240, 240, 240, 0.7)`;

                // Make it visible
                pulseCvs.style.display = 'block';

                // Adjust for dpr
                pulseCvs.width = pulseCvsWidth * dpr;
                pulseCvs.height = hoverBoxHeight * dpr;
                pulseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

                // Draw pulse
                function drawPulse(samples) {
                    const x1 = 2 * gap;
                    const y1 = 2 * gap;
                    const w = pulseCvsWidth - 4 * gap;
                    const h = hoverBoxHeight - 4 * gap;

                    // Clear
                    pulseCtx.setTransform(1, 0, 0, 1, 0, 0);
                    pulseCtx.clearRect(0, 0, pulseCvs.width, pulseCvs.height);
                    pulseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

                    const minVal = Math.min(...samples);
                    const maxVal = Math.max(...samples);

                    // Draw pulse
                    pulseCtx.beginPath();
                    for (let i = 0; i < samples.length; i++) {
                        const px = x1 + (i / (samples.length - 1)) * w;
                        const py = y1 + (1 - (samples[i] - minVal)/ (maxVal - minVal)) * h;

                        if (i == 0) pulseCtx.moveTo(px, py);
                        else pulseCtx.lineTo(px, py);
                    }

                    pulseCtx.strokeStyle = isDark ? "white" : "black";
                    pulseCtx.lineWidth = 1.5;
                    pulseCtx.lineCap = "round";
                    pulseCtx.lineJoin = "round";
                    pulseCtx.stroke();
                }

                // Profile animation
                function animatePulse(duration = 5000) {
                    const start = performance.now();
                    const n = pulse.length;
                    let frameId;

                    function frame(now) {
                        const t = (now - start) / duration;
                        const progress = Math.min(t, 1);

                        // Generate noise
                        const noises = new Array(n).fill(0).map(() => {
                            const theta = 2 * Math.PI * Math.random();
                            const rho = Math.sqrt(-2 * Math.log(1 - Math.random()));
                            return rho * Math.cos(theta);
                        });

                        // Mix pulse and noise
                        const mixed = pulse.map((v, i) => (1 - progress) * noises[i] + progress * v);

                        // Draw pulse
                        drawPulse(mixed);

                        if (progress < 0.99) {
                            frameId = requestAnimationFrame(frame);
                        }
                    }

                    frameId = requestAnimationFrame(frame);
                    return () => cancelAnimationFrame(frameId);
                }

                // Retrieve profile
                const pulse = request.result.profile.map(parseFloat);

                // Start the animation
                cancelPulseAnim = animatePulse();
            }

            ctx.textBaseline = "middle";
            ctx.fillStyle = isDark ? "white" : "black";
                
            ctx.font = `600 ${Math.round(shortSide*0.015)}px monospace`;
            ctx.fillText(`PSR ${request.result.jname}`, x + 2*gap, y + 2*gap);

            if (request.result.bname) {
                ctx.font = `600 ${Math.round(shortSide*0.015)}px monospace`;
                ctx.fillText(`(${request.result.bname})`, x + 16*gap, y + 2*gap);
            }

            if (request.result.meta) {
                ctx.font = `100 ${Math.round(shortSide*0.014)}px monospace`;
                ctx.fillText(`${request.result.meta.replaceAll("_", " ")}`, x + 2*gap, y + 4.2*gap);
            }

            ctx.font = `100 ${Math.round(shortSide*0.012)}px monospace`;
            ctx.fillText(`Galactic longitude (l): ${Number(request.result.gl).toFixed(3)}°`, x + 2*gap, y + 10*gap);
            ctx.fillText(`Galactic latitude (b): ${Number(request.result.gb).toFixed(3)}°`, x + hoverBoxWidth/2 + 2*gap, y + 10*gap);

            if (request.result.raj.trim().split(/\s+/).length < 3) {
                const [hh, mm] = request.result.raj.trim().split(/\s+/);
                ctx.fillText(`Right Ascension (⍺): ${hh}:${mm}`, x + 2*gap, y + 12*gap);
            } else {
                const [hh, mm, ss] = request.result.raj.trim().split(/\s+/);
                ctx.fillText(`Right Ascension (⍺): ${hh}:${mm}:${ss}`, x + 2*gap, y + 12*gap);
            }
            if (request.result.decj.trim().split(/\s+/).length < 3) {
                const [dd, MM] = request.result.decj.trim().split(/\s+/);
                ctx.fillText(`Delination (𝛿): ${dd}°${MM}′`, x + hoverBoxWidth/2 + 2*gap, y + 12*gap);
            } else {
                const [dd, MM, SS] = request.result.decj.trim().split(/\s+/);
                ctx.fillText(`Delination (𝛿): ${dd}°${MM}′${SS}″`, x + hoverBoxWidth/2 + 2*gap, y + 12*gap);
            }

            if (request.result.p0) {
                ctx.fillText(`Period: ${Number(request.result.p0)}s`, x + 2*gap, y + 14*gap);
            } else {
                ctx.fillText(`Period: ‒`, x + 2*gap, y + 14*gap);
            }

            if (request.result.dist) {
                ctx.fillText(`Distance: ${Number(request.result.dist)}kpc`, x + hoverBoxWidth/2 + 2*gap, y + 14*gap);
            } else {
                ctx.fillText(`Distance: ‒`, x + hoverBoxWidth/2 + 2*gap, y + 14*gap);
            }

            if (request.result.mu_l_star && request.result.mu_b) {
                ctx.fillText(`Proper motion (μₗ*, μᵦ): ${Number(request.result.mu_l_star).toFixed(3)} mas/yr, ${Number(request.result.mu_b).toFixed(3)} mas/yr`, x + 2*gap, y + 16*gap);
            } else {
                ctx.fillText(`Proper motion (μₗ*, μᵦ): ‒`, x + 2*gap, y + 16*gap);
            }
            
            ctx.restore();
        };
    } else {
        hoverBoxWidth = shortSide * 0.3;
        hoverBoxHeight = shortSide * 0.05;
        gap = shortSide * 0.01;

        // Default position: upper left of the crosshair
        let x = mouseX - hoverBoxWidth - gap;
        let y = mouseY - hoverBoxHeight - gap;

        // If box top edge would go above the canvas, flip it below
        if (y < 0) {
            y = mouseY + gap;
        }
        // If box left edge would go outside the canvas, flip to right side
        if (x < 0) {
            x = mouseX + gap;
        }
        // If box bottom edge exceeds canvas height, push upward
        if (y + hoverBoxHeight > h) {
            y = h - hoverBoxHeight - gap;
        }
        // If box right edge exceeds canvas width, push leftward
        if (x + hoverBoxWidth > w) {
            x = w - hoverBoxWidth - gap;
        }

        // Mouse's l, b
        const [l, b] = toGalacticXY(mouseX, mouseY, canvas);

        // Draw
        ctx.save();
        ctx.strokeStyle = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(240, 240, 240, 0.7)';
        ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(240, 240, 240, 0.7)';
        ctx.strokeStyle = 1;

        ctx.beginPath();
        ctx.roundRect(x, y, hoverBoxWidth, hoverBoxHeight, 0);
        ctx.fill();
        ctx.closePath();
        ctx.font = `100 ${Math.round(shortSide*0.012)}px monospace`;
        ctx.textBaseline = "middle";
        ctx.fillStyle = isDark ? "white" : "black";
        ctx.fillText(`Galactic longitude (l): ${l.toFixed(3)}°`, x + gap, y + 1.4*gap);
        ctx.fillText(`Galactic latitude (b): ${b.toFixed(3)}°`, x + gap, y - 1.4*gap + hoverBoxHeight);

        ctx.restore();
    }
}

// Draw hover box for mobile
function drawHoverBoxMobile() {
    if (mouseX === null || mouseY === null) return;

    const isDark = document.body.classList.contains("dark-mode");
    // Use canvas client size (CSS pixels) for conversion
    const w = canvas.clientWidth || canvas.width;
    const h = canvas.clientHeight || canvas.height;

    // Hover box size
    const shortSide = Math.min(canvas.clientWidth, canvas.clientHeight);
    let hoverBoxWidth, hoverBoxHeight, gap;

    // Nearest pulsar and minimum distance
    let nearest = null;
    let minDist = Infinity;

    // Distance threshold (in pixels)
    const distThreshold = 12;
    
    // Find nearest pulsar
    for (const pulsar of pulsars) {
        if (!pulsar.gl || !pulsar.gb) continue;

        // Find pulsar coordinate on canvas
        const [l, b] = [pulsar.gl, pulsar.gb];
        let px, py;
        if (!isZoomed) {
            if (l > 0 && l < 180) {
                px = (1 - l / 180) * w / 2;
                py = (90 - b) / 180 * h;
            } else {
                px = (180 - l) / 180 * (w / 2) + w;
                py = (90 - b) / 180 * h;
            }
        } else {
            const l1 = viewLMin;
            const l2 = viewLMax;
            const b1 = viewBMin;
            const b2 = viewBMax;
            const midLineX = midLineR * w;

            if (passedMidLine == true) {
                if (l > 0 && l < 180) {
                    // If outside the bounds, then ignore
                    if (l > l1 || b < b1 || b > b2) continue;

                    // Inside the bounds, plot
                    px = (1 - l / l1) * midLineX;
                    py = (b - b2) / (b1 - b2) * h;
                } else {
                    // If outside the bounds, then ignore
                    if (l < l2 || b < b1 || b > b2) continue;

                    // Inside the bounds, plot
                    px = (l - l2) / (l2 - 360) * (w - midLineX) + w;
                    py = (b - b2) / (b1 - b2) * h;
                }
            } else {
                // If ouside the bounds, then ignore
                if (l < l1 || l > l2 || b < b1 || b > b2) continue;

                // Inside the bounds, plot
                px = (l - l2) / (l1 - l2) * w;
                py = (b - b2) / (b1 - b2) * h;
            }
        }
        if (!isFinite(px) || !isFinite(py) || px < 0 || px > w || py < 0 || py > h) continue;

        // Distance between mouse and pulsar
        const dist = Math.sqrt((mouseX-px)*(mouseX-px)+(mouseY-py)*(mouseY-py));

        if (dist < minDist) {
            nearest = pulsar;
            minDist = dist;
        }
    }

    if (minDist < distThreshold) {
        // Retrieve pulsar object store
        const pulsarStore = db.transaction(DB_PULSAR_STORE, 'readonly').objectStore(DB_PULSAR_STORE);

        // Retrieve the nearest pulsar
        const request = pulsarStore.get(nearest.jname);
        request.onsuccess = () => {
            // Hover box size
            hoverBoxWidth = shortSide * 0.7;
            hoverBoxHeight = shortSide * 0.252;
            gap = shortSide * 0.05;
            const pulseCvsWidth = shortSide * 0.28;

            // Default position: upper left of the crosshair
            let x = mouseX - hoverBoxWidth - gap;
            let y = mouseY - hoverBoxHeight - gap;
            
            // If box top edge would go above the canvas, flip it below
            if (y < 0) {
                y = mouseY + gap;
            }
            // If box left edge would go outside the canvas, flip to right side
            if (request.result.profile) {
                if (x - pulseCvsWidth < 0) {
                    x = mouseX + gap + pulseCvsWidth;
                }
            } else {
                if (x < 0) {
                    x = mouseX + gap;
                }
            }
            // If box bottom edge exceeds canvas height, push upward
            if (y + hoverBoxHeight > h) {
                y = h - hoverBoxHeight - gap;
            }
            // If box right edge exceeds canvas width, push leftward
            if (x + hoverBoxWidth > w) {
                x = w - hoverBoxWidth - gap;
            }

            // Draw hover box
            ctx.save();
            ctx.strokeStyle = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(240, 240, 240, 0.7)';
            ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(240, 240, 240, 0.7)';
            ctx.strokeStyle = 1;

            ctx.beginPath();
            ctx.roundRect(x, y, hoverBoxWidth, hoverBoxHeight, 0);
            ctx.fill();
            ctx.closePath();

            // If profile exists, draw box for drawing profile
            if (request.result.profile) {
                const pulseCvs = document.getElementById('cvs-pulse');
                const pulseCtx = pulseCvs.getContext('2d');

                // Position pulse canvas
                const rect = canvas.getBoundingClientRect();
                pulseCvs.style.left = rect.left + window.scrollX + x - pulseCvsWidth + 'px';
                pulseCvs.style.top = rect.top + window.scrollY + y + 'px';
                pulseCvs.style.width = pulseCvsWidth + 'px';
                pulseCvs.style.height = hoverBoxHeight + 'px';

                // Background
                pulseCvs.style.background = isDark ? `rgba(0, 0, 0, 0.6)` : `rgba(240, 240, 240, 0.7)`;

                // Make it visible
                pulseCvs.style.display = 'block';

                // Adjust for dpr
                pulseCvs.width = pulseCvsWidth * dpr;
                pulseCvs.height = hoverBoxHeight * dpr;
                pulseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

                // Draw pulse
                function drawPulse(samples) {
                    const x1 = gap/2;
                    const y1 = gap/2;
                    const w = pulseCvsWidth - gap;
                    const h = hoverBoxHeight - gap;

                    // Clear
                    pulseCtx.setTransform(1, 0, 0, 1, 0, 0);
                    pulseCtx.clearRect(0, 0, pulseCvs.width, pulseCvs.height);
                    pulseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

                    const minVal = Math.min(...samples);
                    const maxVal = Math.max(...samples);

                    // Draw pulse
                    pulseCtx.beginPath();
                    for (let i = 0; i < samples.length; i++) {
                        const px = x1 + (i / (samples.length - 1)) * w;
                        const py = y1 + (1 - (samples[i] - minVal)/ (maxVal - minVal)) * h;

                        if (i == 0) pulseCtx.moveTo(px, py);
                        else pulseCtx.lineTo(px, py);
                    }

                    pulseCtx.strokeStyle = isDark ? "white" : "black";
                    pulseCtx.lineWidth = 1.5;
                    pulseCtx.lineCap = "round";
                    pulseCtx.lineJoin = "round";
                    pulseCtx.stroke();
                }

                // Profile animation
                function animatePulse(duration = 5000) {
                    const start = performance.now();
                    const n = pulse.length;
                    let frameId;

                    function frame(now) {
                        const t = (now - start) / duration;
                        const progress = Math.min(t, 1);

                        // Generate noise
                        const noises = new Array(n).fill(0).map(() => {
                            const theta = 2 * Math.PI * Math.random();
                            const rho = Math.sqrt(-2 * Math.log(1 - Math.random()));
                            return rho * Math.cos(theta);
                        });

                        // Mix pulse and noise
                        const mixed = pulse.map((v, i) => (1 - progress) * noises[i] + progress * v);

                        // Draw pulse
                        drawPulse(mixed);

                        if (progress < 0.99) {
                            frameId = requestAnimationFrame(frame);
                        }
                    }

                    frameId = requestAnimationFrame(frame);
                    return () => cancelAnimationFrame(frameId);
                }

                // Retrieve profile
                const pulse = request.result.profile.map(parseFloat);

                // Start the animation
                cancelPulseAnim = animatePulse();
            }

            ctx.textBaseline = "middle";
            ctx.fillStyle = isDark ? "white" : "black";
                
            ctx.font = `600 ${Math.round(shortSide*0.021)}px monospace`;
            ctx.fillText(`PSR ${request.result.jname}`, x + gap/2, y + gap/2);

            if (request.result.bname) {
                ctx.font = `600 ${Math.round(shortSide*0.021)}px monospace`;
                ctx.fillText(`(${request.result.bname})`, x + 5*gap, y + gap/2);
            }

            if (request.result.meta) {
                ctx.font = `100 ${Math.round(shortSide*0.02)}px monospace`;
                ctx.fillText(`${request.result.meta.replaceAll("_", " ")}`, x + gap/2, y + 1.2*gap);
            }

            ctx.font = `100 ${Math.round(shortSide*0.017)}px monospace`;
            ctx.fillText(`Galactic longitude (l): ${Number(request.result.gl).toFixed(3)}°`, x + gap/2, y + 2.4*gap);
            ctx.fillText(`Galactic latitude (b): ${Number(request.result.gb).toFixed(3)}°`, x + hoverBoxWidth/2 + gap/2, y + 2.4*gap);

            if (request.result.raj.trim().split(/\s+/).length < 3) {
                const [hh, mm] = request.result.raj.trim().split(/\s+/);
                ctx.fillText(`Right Ascension (⍺): ${hh}:${mm}`, x + gap/2, y + 3.1*gap);
            } else {
                const [hh, mm, ss] = request.result.raj.trim().split(/\s+/);
                ctx.fillText(`Right Ascension (⍺): ${hh}:${mm}:${ss}`, x + gap/2, y + 3.1*gap);
            }
            if (request.result.decj.trim().split(/\s+/).length < 3) {
                const [dd, MM] = request.result.decj.trim().split(/\s+/);
                ctx.fillText(`Delination (𝛿): ${dd}°${MM}′`, x + hoverBoxWidth/2 + gap/2, y + 3.1*gap);
            } else {
                const [dd, MM, SS] = request.result.decj.trim().split(/\s+/);
                ctx.fillText(`Delination (𝛿): ${dd}°${MM}′${SS}″`, x + hoverBoxWidth/2 + gap/2, y + 3.1*gap);
            }

            if (request.result.p0) {
                ctx.fillText(`Period: ${Number(request.result.p0)}s`, x + gap/2, y + 3.8*gap);
            } else {
                ctx.fillText(`Period: ‒`, x + gap/2, y + 3.8*gap);
            }

            if (request.result.dist) {
                ctx.fillText(`Distance: ${Number(request.result.dist)}kpc`, x + hoverBoxWidth/2 + gap/2, y + 3.8*gap);
            } else {
                ctx.fillText(`Distance: ‒`, x + hoverBoxWidth/2 + gap/2, y + 3.8*gap);
            }

            if (request.result.mu_l_star && request.result.mu_b) {
                ctx.fillText(`Proper motion (μₗ*, μᵦ): ${Number(request.result.mu_l_star).toFixed(3)} mas/yr, ${Number(request.result.mu_b).toFixed(3)} mas/yr`, x + gap/2, y + 4.5*gap);
            } else {
                ctx.fillText(`Proper motion (μₗ*, μᵦ): ‒`, x + gap/2, y + 4.5*gap);
            }
            
            ctx.restore();
        };
    } else {
        hoverBoxWidth = shortSide * 0.5;
        hoverBoxHeight = shortSide * 0.1;
        gap = shortSide * 0.05

        // Default position: upper left of the crosshair
        let x = mouseX - hoverBoxWidth - gap;
        let y = mouseY - hoverBoxHeight - gap;

        // If box top edge would go above the canvas, flip it below
        if (y < 0) {
            y = mouseY + gap;
        }
        // If box left edge would go outside the canvas, flip to right side
        if (x < 0) {
            x = mouseX + gap;
        }
        // If box bottom edge exceeds canvas height, push upward
        if (y + hoverBoxHeight > h) {
            y = h - hoverBoxHeight - gap;
        }
        // If box right edge exceeds canvas width, push leftward
        if (x + hoverBoxWidth > w) {
            x = w - hoverBoxWidth - gap;
        }

        // Mouse's l, b
        const [l, b] = toGalacticXY(mouseX, mouseY, canvas);

        // Draw
        ctx.save();
        ctx.strokeStyle = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(240, 240, 240, 0.7)';
        ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(240, 240, 240, 0.7)';
        ctx.strokeStyle = 1;

        ctx.beginPath();
        ctx.roundRect(x, y, hoverBoxWidth, hoverBoxHeight, 0);
        ctx.fill();
        ctx.closePath();
        ctx.font = `100 ${Math.round(shortSide*0.017)}px monospace`;
        ctx.textBaseline = "middle";
        ctx.fillStyle = isDark ? "white" : "black";
        ctx.fillText(`Galactic longitude (l): ${l.toFixed(3)}°`, x + gap/2, y + 1.4*gap);
        ctx.fillText(`Galactic latitude (b): ${b.toFixed(3)}°`, x + gap/2, y - 1.4*gap + hoverBoxHeight);

        ctx.restore();
    }
}

// Mouse move event (without dragging)
canvas.addEventListener("mousemove", (event) => {
    if (isDragging) return;
    
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

    // Cancel pulse animation
    if (cancelPulseAnim) {
        cancelPulseAnim();
        cancelPulseAnim = null;
    }

    // Make pulse canvas invisible
    const pulseCvs = document.getElementById('cvs-pulse');
    pulseCvs.style.display = 'none';

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

    // Cancel pulse animation
    if (cancelPulseAnim) {
        cancelPulseAnim();
        cancelPulseAnim = null;
    }

    // Make pulse canvas invisible
    const pulseCvs = document.getElementById('cvs-pulse');
    pulseCvs.style.display = 'none';
});

// Draw selection box
function drawSelectionBox() {
    if (!dragStart || !dragEnd) return;

    const x = Math.min(dragStart.x, dragEnd.x);
    const y = Math.min(dragStart.y, dragEnd.y);
    const w = Math.abs(dragStart.x - dragEnd.x);
    const h = Math.abs(dragStart.y - dragEnd.y);

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(0, 122, 255, 0.2)';
    ctx.strokeStyle = 'rgba(0, 122, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
}

// Mouse down
canvas.addEventListener('mousedown', (event) => {
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    dragStart = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    dragEnd = { ...dragStart };
});

// Mouse move (with dragging)
canvas.addEventListener('mousemove', (event) => {
    if (!isDragging) return;

    const rect = canvas.getBoundingClientRect();
    dragEnd = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    // redraw offscreen and selection
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscnCvs, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawSelectionBox();
});

// Mouse up = apply zoom
canvas.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;

    // Prevent zero-size selections
    let dx = Math.abs(dragStart.x - dragEnd.x);
    let dy = Math.abs(dragStart.y - dragEnd.y);
    if (dx < 1e-3 || dy < 1e-3) return;

    isZoomed = true;

    // Canvas width
    const w = canvas.clientWidth || canvas.width;

    // Find mid-line position
    const midLineX = midLineR * w;

    // If the selection includes mid-line
    viewXMin = Math.min(dragStart.x, dragEnd.x);
    viewXMax = Math.max(dragStart.x, dragEnd.x);
    if (midLineX > viewXMin && midLineX < viewXMax) {
        passedMidLine = true;
    } else {
        passedMidLine = false;
    }

    // Convert canvas x, y to Galactic longitude and latitude
    const [l1, b1] = toGalacticXY(dragStart.x, dragStart.y, canvas);
    const [l2, b2] = toGalacticXY(dragEnd.x, dragEnd.y, canvas);

    // Bounds
    viewLMin = Math.min(l1, l2);
    viewLMax = Math.max(l1, l2);
    viewBMin = Math.min(b1, b2);
    viewBMax = Math.max(b1, b2);
    if (passedMidLine == true) {
        viewLLeft = viewLMin;
        viewLRight = viewLMax;
    } else {
        viewLLeft = viewLMax;
        viewLRight = viewLMin;
    }

    // Update mid-line ratio
    midLineR = (midLineX - viewXMin) / (viewXMax - viewXMin);

    // Redraw with zoomed view
    drawPulsars();
});

// Double click = reset zoom
canvas.addEventListener('dblclick', () => {
    viewLMin = 0;
    viewLMax = 360;
    viewBMin = -90;
    viewBMax = 90;
    viewLLeft = 180;
    viewLRight = 180;
    viewXMin = 0;
    viewXMax = canvas.clientWidth;
    midLineR = 0.5;
    passedMidLine = false;
    isZoomed = false;

    // Redraw without zoomed view
    drawPulsars();
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

    // Cancel pulse animation
    if (cancelPulseAnim) {
        cancelPulseAnim();
        cancelPulseAnim = null;
    }

    // Make pulse canvas invisible
    const pulseCvs = document.getElementById('cvs-pulse');
    pulseCvs.style.display = 'none';

    // Draw hover box
    drawHoverBoxMobile();
}

canvas.addEventListener("touchstart", (event) => {
    event.preventDefault();
    if (event.touches.length !== 1) return;

    const t = event.touches[0];
    const rect = canvas.getBoundingClientRect();

    initTouchX = t.clientX - rect.left;
    initTouchY = t.clientY - rect.top;

    // Show hover box until long-press triggers selection
    isTouchSelect = false;

    // 1s long touch threshold
    touchTimer = setTimeout(() => {
        isTouchSelect = true;
    }, 1000);
});

// Touch move
canvas.addEventListener("touchmove", (event) => {
    event.preventDefault();
    if (event.touches.length !== 1) return;

    const t = event.touches[0];
    const rect = canvas.getBoundingClientRect();

    thisTouchX = t.clientX - rect.left;
    thisTouchY = t.clientY - rect.top;

    if (!isTouchSelect) {
        const dx = thisTouchX - initTouchX;
        const dy = thisTouchY - initTouchY;

        // 5px is moving threshold
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }

        // Draw hover box
        mouseX = t.clientX - rect.left;
        mouseY = t.clientY - rect.top;
        handleTouchMove();
    } else {
        // Redraw offscreen and selection
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(offscnCvs, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Draw selection box
        const x = Math.min(initTouchX, thisTouchX);
        const y = Math.min(initTouchY, thisTouchY);
        const w = Math.abs(initTouchX - thisTouchX);
        const h = Math.abs(initTouchY - thisTouchY);

        ctx.save();
        ctx.fillStyle = 'rgba(0, 122, 255, 0.2)';
        ctx.strokeStyle = 'rgba(0, 122, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }
});

// Touch end: hide box
canvas.addEventListener("touchend", (event) => {
    // Ignore multi-touch
    if (event.touches.length > 0) return;

    clearTimeout(touchTimer);
    touchTimer = null;

    // Zoom out to original if double tap
    const now = performance.now();
    const dt = now - lastTapTime;

    // 300ms is typical double-tap threshold
    if (dt < 300) {
        // Reset
        lastTapTime = 0;

        // Zoom out
        viewLMin = 0;
        viewLMax = 360;
        viewBMin = -90;
        viewBMax = 90;
        viewLLeft = 180;
        viewLRight = 180;
        viewXMin = 0;
        viewXMax = canvas.clientWidth;
        midLineR = 0.5;
        passedMidLine = false;
        isZoomed = false;

        // Redraw without zoomed view
        drawPulsars();

        return;
    }

    lastTapTime = now;

    if (isTouchSelect) {
        // Prevent tiny selection
        let dx = Math.abs(thisTouchX - initTouchX);
        let dy = Math.abs(thisTouchY - initTouchY);
        if (dx < 10 || dy < 10) return;

        isZoomed = true;

        // Canvas width
        const w = canvas.clientWidth || canvas.width;

        // Find mid-line position
        const midLineX = midLineR * w;

        // If the selection includes mid-line
        viewXMin = Math.min(initTouchX, thisTouchX);
        viewXMax = Math.max(initTouchX, thisTouchX);
        if (midLineX > viewXMin && midLineX < viewXMax) {
            passedMidLine = true;
        } else {
            passedMidLine = false;
        }

        // Convert canvas x, y to Galactic longitude and latitude
        const [l1, b1] = toGalacticXY(initTouchX, initTouchY, canvas);
        const [l2, b2] = toGalacticXY(thisTouchX, thisTouchY, canvas);

        // Bounds
        viewLMin = Math.min(l1, l2);
        viewLMax = Math.max(l1, l2);
        viewBMin = Math.min(b1, b2);
        viewBMax = Math.max(b1, b2);
        if (passedMidLine == true) {
            viewLLeft = viewLMin;
            viewLRight = viewLMax;
        } else {
            viewLLeft = viewLMax;
            viewLRight = viewLMin;
        }

        // Update mid-line ratio
        midLineR = (midLineX - viewXMin) / (viewXMax - viewXMin);

        // Redraw with zoomed view
        drawPulsars();
    } else {
        mouseX = null;
        mouseY = null;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(offscnCvs, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Cancel pulse animation
        if (cancelPulseAnim) {
            cancelPulseAnim();
            cancelPulseAnim = null;
        }

        // Make pulse canvas invisible
        const pulseCvs = document.getElementById('cvs-pulse');
        pulseCvs.style.display = 'none';
    }
});

window.addEventListener("scroll", () => {
    drawHelpPan();
});

helpCvs.addEventListener("mouseenter", () => {
    const helpRect = helpCvs.getBoundingClientRect();
    const isDark = document.body.classList.contains("dark-mode");

    helpBox.textContent = 
        "Usage:\n\n" +
        "· Mouse left button down and drag to zoom\n" +
        "· Double-click to restore\n\n" +
        "Notes:\n\n" +
        "· The map is under the galactic coordinate system. If you're not familiar with the coordinate system, think this way: the Milky Way is a flat disk, like a giant spinning pancake; the north side means if you look downward at the 'pancake' and the 'pancake' spins counterclockwise; now imagine floating at the center of the Sun, facing the Milky Way's center, with your head toward the north side; straight ahead is galactic longitude 0°; turn left around the galactic disk and longitude increases through 90°, 180° and back to 360°; then look upward the latitude rises to +90°, look downward the latitude falls to −90°.\n\n" +
        "· Each pulsar is drawn with a circle. The more distant the pulsar the smaller the circle. Pulsars travel across our line of sight — proper motion μ, measured in milliarcseconds per year (one arcsecond is one part in 3,600 of a degree in angle). The longer the line the larger the proper motion. If a pulsar spins faster than 10 milliseconds, its circle is drawn with blue color.\n\n" +
        ". Pulsars send us pulsating signals. The animation mimics only after adding thousands of the signals together we can finally see a pulsar's signal — pulsars are faint stars. (The animations are to be continued for more pulsars.)";
    
    if (window.innerWidth < 700) {
        helpBox.style.left = (helpRect.left - 400) + "px";
        helpBox.style.top = (helpRect.top - 10) + "px"
    } else {
        helpBox.style.left = (helpRect.left - 680) + "px";
        helpBox.style.top = (helpRect.top - 400) + "px"
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
        "Usage:\n\n" +
        "· Touch and move to see pulsar parameters\n" +
        "· Long touch and drag to zoom\n" +
        "· Double tap to restore\n\n" +
        "Notes:\n\n" +
        "· The map is under the galactic coordinate system. If you're not familiar with the coordinate system, think this way: the Milky Way is a flat disk, like a giant spinning pancake; the north side means if you look downward at the 'pancake' and the 'pancake' spins counterclockwise; now imagine floating at the center of the Sun, facing the Milky Way's center, with your head toward the north side; straight ahead is galactic longitude 0°; turn left around the galactic disk and longitude increases through 90°, 180° and back to 360°; then look upward the latitude rises to +90°, look downward the latitude falls to −90°.\n\n" +
        "· Each pulsar is drawn as a circle. The more distant the pulsar the smaller the circle. Pulsars travel across our line of sight — proper motion μ, measured in milliarcseconds per year (one arcsecond is one part in 3,600 of a degree in angle). The longer the line the larger the proper motion. If a pulsar spins faster than 10 milliseconds, its circle is drawn with blue color.\n\n" +
        ". Pulsars send us pulsating signals. The animation mimics only after adding thousands of the signals together we can finally see a pulsar's signal — pulsars are faint stars. (The animations are to be continued for more pulsars.)";
    
    if (window.innerHeight > window.innerWidth) {
        // Portrait orientation
        helpBox.style.left = (helpRect.left - 300) + "px";
        helpBox.style.top = (helpRect.top - 70) + "px";
        helpBox.style.minWidth = '250px';
        helpBox.style.maxWidth = '270px';
        helpBox.style.minHeight = '500px';
        helpBox.style.maxHeight = '520px';
    } else {
        // Landscape orientation
        helpBox.style.left = (helpRect.left - 700) + "px";
        helpBox.style.top = (helpRect.top - 250) + "px";
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