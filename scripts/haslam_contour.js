const canvas = document.getElementById("contours");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;

    // Title height
    const titleHeight = document.querySelector(".map-title").offsetHeight;

    // CSS size
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = (window.innerHeight - titleHeight) + "px";

    // Actual pixels
    canvas.width = window.innerWidth * dpr;
    canvas.height = (window.innerHeight - titleHeight) * dpr;

    // Reset transform and scale so drawing units = CSS pixels
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Update to use css width/height
    canvas.cssWidth = window.innerWidth;
    canvas.cssHeight = window.innerHeight - titleHeight;
}

// Resize window listener
window.addEventListener("resize", () => {
    resizeCanvas();
    if (window.contourData) {
        drawContours(window.contourData);
    }
});

// Initial sizing
resizeCanvas();

// Fetch JSON
fetch("data/haslam_gallpeters_contours_simplified.json")
.then(response => response.json())
.then(data => {
    // Keep contour data
    window.contourData = data;
    drawContours(data);
});

// Map longitude to pixel
function lonToPx(lon) {
    const shifted = ((lon + 180) % 360) - 180;
    return ((shifted + 180) / 360) * canvas.cssWidth;
}

// Map latitude to pixel
function latToPx(lat) {
    return canvas.cssHeight - ((lat + 2) / 4) * canvas.cssHeight;
}

// Detect seam crossing
function crossesSeam(lon1, lon2) {
    const x1 = lonToPx(lon1);
    const x2 = lonToPx(lon2);
    const dx = Math.abs(x1 - x2);

    return dx > canvas.cssWidth / 2;
}

// Draw
function drawContours(data) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    Object.keys(data).forEach(level => {
        const paths = data[level];

        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;

        paths.forEach(path => {
            if (path.length < 2) return;

            ctx.beginPath();

            for (let i = 0; i < path.length; i++) {
                const [lon, lat] = path[i];
                const px = lonToPx(lon);
                const py = latToPx(lat);

                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    const [prevLon, prevLat] = path[i - 1];
                    if (crossesSeam(prevLon, lon)) {
                        console.log(prevLon, lon);
                        // seam crossing: finish current stroke, start new subpath
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                    } else {
                        ctx.lineTo(px, py);
                    }
                }
            }

            ctx.stroke();
        });
    });
}