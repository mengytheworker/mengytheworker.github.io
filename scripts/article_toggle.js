// To toggle articles in tip.html/thanks.html
const tocItems= document.querySelectorAll(".toc-list li");
const articles = document.querySelectorAll(".article");

tocItems.forEach(item => {
    item.addEventListener("click", () => {
        const targetId = item.dataset.article;

        // Update TOC active state
        tocItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");
        /*
        // Show the selected article
        articles.forEach(article => {
            article.classList.remove("active");
            if (article.id === targetId) {
                article.classList.add("active");
            }
        }); */

        // Smooth article transition
        const oldArticle = document.querySelector(".article.active");
        const newArticle = document.getElementById(targetId);

        if (newArticle === oldArticle) return;

        // Fade out old
        oldArticle.classList.remove("active");

        // After fade-out old, fade in new
        setTimeout(() => {
            newArticle.classList.add("active");
        }, 250);
    });
});

// On narrow screen, toggle toc drawer
const tocToggle = document.querySelector(".toc-toggle");
const toc = document.querySelector(".toc");
const articleArea = document.querySelector(".article-area");

// Toggle drawer
tocToggle.addEventListener("click", () => {
    toc.classList.toggle("open");
    articleArea.classList.toggle("dim");
});

// Close drawer when clicking an item
tocItems.forEach(item => {
    item.addEventListener("click", () => {
        toc.classList.remove("open");
        articleArea.classList.remove("dim");
    });
});

// Auto-close TOC when tapping outside (narrow screen)
document.addEventListener("click", (event) => {
    const isTocOpen = toc.classList.contains("open");
    if (!isTocOpen) return;

    const clickedInsideToc = toc.contains(event.target);
    const clickedToggle = tocToggle.contains(event.target);

    if (!clickedInsideToc && !clickedToggle) {
        toc.classList.remove("open");
        articleArea.classList.remove("dim");
    }
});
