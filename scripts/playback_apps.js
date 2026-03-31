/* 
    Play multiple tutorials toggled by the demo-switch button
*/

// Expose
window.playVideo = playVideo;

// Video count
let videoCount = 0;

// Active video
let lastVideo = null;

// Video dictionaries
const videoMeta = [
    {
        // Video 1 - Radio Pulsars
        videoLight: "video-pulsar-light",
        videoDark: "video-pulsar-dark",
        scriptTimelineLight: [
            {time: 0, step: 1},
            {time: 9, step: 2},
            {time: 12, step: 3},
            {time: 26, step: 4},
            {time: 37, step: 5},
            {time: 43, step: 6},
            {time: 57, step: 7},
        ],
        scriptTimelineDark: [
            {time: 0, step: 1},
            {time: 11, step: 2},
            {time: 15.5, step: 3},
            {time: 23, step: 4},
            {time: 34.5, step: 5},
            {time: 43, step: 6},
            {time: 57, step: 7},
        ],
        scriptClass: ".script-1"
    }, 
    {
        // Video 2 - Hz Sky
        videoLight: "video-sky-light",
        videoDark: "video-sky-dark",
        scriptTimelineLight: [
            {time: 0, step: 1},
            {time: 8, step: 2},
            {time: 10, step: 3},
            {time: 13, step: 4},
            {time: 16.7, step: 5},
            {time: 19, step: 6},
        ],
        scriptTimelineDark: [
            {time: 0, step: 1},
            {time: 4, step: 2},
            {time: 9, step: 3},
            {time: 12, step: 4},
            {time: 16.7, step: 5},
            {time: 19, step: 6},
        ],
        scriptClass: ".script-2"
    }
];

// Switch button click event listener
document.getElementById("demo-switch").addEventListener("click", () => {
    // Retrieve current content
    const thisVideo = document.querySelector(".demo-video[style*='block']");
    const replayBtn = document.getElementById("replay-button");
    const thisScript = document.querySelectorAll(`${videoMeta[videoCount].scriptClass}.active`);

    // Animate current content out
    if (thisVideo) thisVideo.classList.add("switch-out-video");
    if (replayBtn) replayBtn.classList.add("switch-out-script");
    if (thisScript) thisScript.forEach(s => {s.classList.add("switch-out-script");});

    // After animation, switch content and animate in
    setTimeout(() => {
        // After animation, remove animation for old content
        if (thisVideo) thisVideo.classList.remove("switch-out-video");
        if (replayBtn) replayBtn.classList.remove("switch-out-script");
        if (thisScript) thisScript.forEach(s => {s.classList.remove("switch-out-script")});

        // Play new content
        videoCount = (videoCount + 1) % videoMeta.length;
        playVideo();

        // Retrieve new content
        const nextVideo = document.querySelector(".demo-video[style*='block']");
        const nextScript = document.querySelectorAll(`${videoMeta[videoCount].scriptClass}.active`);

        // Animate new content
        if (nextVideo) nextVideo.classList.add("switch-in-video");
        if (replayBtn) replayBtn.classList.add("switch-in-script");
        if (nextScript) nextScript.forEach(s => s.classList.add("switch-in-script"));

        // After animation, remove animation for new content
        setTimeout(() => {
            if (nextVideo) nextVideo.classList.remove("switch-in-video");
            if (replayBtn) replayBtn.classList.remove("switch-in-script");
            if (nextScript) nextScript.forEach(s => s.classList.remove("switch-in-script"));
        }, 600);
    }, 600);
});

function playVideo() {
    // For animation on narrow screen
    let jumpClassRemoved = false;
    let jumpClassAdded = false;

    // Reset
    // Pause and hide all videos
    document.querySelectorAll(".demo-video").forEach(v => {
        v.pause();
        v.currentTime = 0;
        v.style.display = "none";
    });

    // Hide all scripts
    document.querySelectorAll(".script-1, .script-2").forEach(s => {
        s.classList.remove("active");
        s.style.display = "none";
    });

    // Play video
    // Active video's meta
    const meta = videoMeta[videoCount];

    // Dark or light?
    const isDark = document.body.classList.contains("dark-mode");
    
    // Get, show and play active video
    const video = isDark ? document.getElementById(meta.videoDark) : document.getElementById(meta.videoLight);
    video.style.display = "block";
    video.play();

    // Play script
    // Retrieve script timeline
    const scriptTimeline = isDark ? meta.scriptTimelineDark : meta.scriptTimelineLight;

    // Retrieve script steps
    const steps = document.querySelectorAll(meta.scriptClass);

    // Reset steps
    setActiveStep(1);

    // Remove old timeupdate listener
    if (lastVideo && lastVideo._onTimeUpdate) {
        lastVideo.removeEventListener("timeupdate", lastVideo._onTimeUpdate);
    }

    // Define new timeupdate
    video._onTimeUpdate = function () {
        for (let i = scriptTimeline.length - 1; i >= 0; i--) {
            if (video.currentTime >= scriptTimeline[i].time) {
                setActiveStep(scriptTimeline[i].step);
                break;
            }
        }
    };

    // Add new timeupdate listener
    video.addEventListener("timeupdate", video._onTimeUpdate);

    // Replay
    const replayBtn = document.getElementById("replay-button");

    // Remove old play listener
    if (lastVideo && lastVideo._onPlay) {
        lastVideo.removeEventListener("play", lastVideo._onPlay);
    }

    // Define new play
    video._onPlay = function () {
        replayBtn.style.display = "none";
    }

    // Add new play listener
    video.addEventListener("play", video._onPlay);

    // Remove old ended listener
    if (lastVideo && lastVideo._onEnded) {
        lastVideo.removeEventListener("ended", lastVideo._onEnded);
    }

    // Define new ended
    video._onEnded = function () {
        replayBtn.style.display = "block";
    }

    // Add new ended listener
    video.addEventListener("ended", video._onEnded);

    // Define replay button click
    replayBtn._onClick = function () {
        replayBtn.style.display = "none";

        video.currentTime = 0;
        video.play();

        // Hide all scripts
        document.querySelectorAll(".script-1, .script-2").forEach(s => {
            s.classList.remove("active");
            s.style.display = "none";
        });

        setActiveStep(1);  // Restart script
    }

    // Remove old click listener
    replayBtn.removeEventListener("click", replayBtn._onClick);

    // Add new click listener
    replayBtn.addEventListener("click", replayBtn._onClick);

    lastVideo = video;

    function setActiveStep(n) {
        // Update active classes for steps
        steps.forEach(s => {
            //s.classList.toggle("active", s.dataset.step == n);
            if (s.dataset.step == n) {
                s.style.display = "block";
                s.classList.add("active");
            } else {
                s.classList.remove("active");
                s.style.display = "none";
            }
        });

        // Trigger jump animation only when step 7 first becomes active
        if (videoCount == 0 && n == 7) {
            let queryString = meta.scriptClass.concat('[data-step="7"] ').concat(`.app-link-1`);
            const lastStep = document.querySelector(queryString);

            if (lastStep) {
                // Remove previous jump class
                if (!jumpClassRemoved) {
                    lastStep.classList.remove("app-jump");
                    void lastStep.offsetWidth;
                    jumpClassRemoved = true;
                }

                // Add jump class (animation)
                if (!jumpClassAdded) {
                    lastStep.classList.add("app-jump");
                    jumpClassAdded = true;
                }
            }
        }

        if (videoCount == 1 && n == 6) {
            let queryString = meta.scriptClass.concat('[data-step="6"] ').concat(`.app-link-2`);
            const lastStep = document.querySelector(queryString);

            if (lastStep) {
                // Remove previous jump class
                if (!jumpClassRemoved) {
                    lastStep.classList.remove("app-jump");
                    void lastStep.offsetWidth;
                    jumpClassRemoved = true;
                }

                // Add jump class (animation)
                if (!jumpClassAdded) {
                    lastStep.classList.add("app-jump");
                    jumpClassAdded = true;
                }
            }
        }
    }
}
