document.addEventListener("DOMContentLoaded", () => {
    const heart = document.querySelector("nav .right .heart");
    if (!heart) return;

    let hintVisible = false;
    let hintTimeout = null;

    heart.addEventListener("click", (e) => {
        // Desktop: let normal click work
        if (window.matchMedia("(hover: hover)").matches) {
            return;
        }

        // Mobile behavior
        if (!hintVisible) {
            e.preventDefault(); // stop link opening
            heart.classList.add("show-hint");
            hintVisible = true;

            // Auto-hide after 2.5s
            hintTimeout = setTimeout(() => {
                heart.classList.remove("show-hint");
                hintVisible = false;
            }, 2500);
        } else {
            // Second tap -> allow navigation
            heart.classList.remove("show-hint");
            hintVisible = false;
            clearTimeout(hintTimeout);
        }
    });

    // Tap elsewhere hides hint
    document.addEventListener("touchstart", (e) => {
        if (!heart.contains(e.target)) {
            heart.classList.remove("show-hint");
            hintVisible = false;
            clearTimeout(hintTimeout);
        }
    });
});