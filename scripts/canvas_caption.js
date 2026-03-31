// Alter canvas caption
document.addEventListener("DOMContentLoaded", () => {
    const caption = document.querySelector(".caption") || document.getElementById("caption");
    const canvas1 = document.getElementById("canvas1");
    const canvas2 = document.getElementById("canvas2");

    const defaultText = caption ? caption.textContent.trim() : "";

    //function setCaption(text) {
    //    if (caption) caption.textContent = text;
    //}

    if (canvas1) {
        canvas1.addEventListener("mouseenter", () => {
            if (caption) caption.innerHTML = 'Hit to explore <span class="caption-pulsars">pulsars</span>!';
        });
        canvas1.addEventListener("mouseleave", () => {
            caption.textContent = defaultText;
        });
    } else {
        console.warn("[canvas_caption] canvas1 not found");
    }

    if (canvas2) {
        canvas2.addEventListener("mouseenter", () => {
            if (caption) caption.innerHTML = 'Hit to explore <span class="caption-temperatures">sky temperatures</span>!';
        });
        canvas2.addEventListener("mouseleave", () => {
            caption.textContent = defaultText;
        });
    } else {
        console.warn("[canvas_caption] canvas2 not found");
    }
});
