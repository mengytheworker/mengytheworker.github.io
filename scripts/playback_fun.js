// Expose
window.playVideo = playVideo;

// Script timeline
const scriptTimeline = [
    {time: 0, step: 1}, 
    {time: 9, step: 2},
    {time: 11, step: 3},
    {time: 13, step: 4},
    {time: 20, step: 5},
    {time: 22, step: 6},
    {time: 32, step: 7},
    {time: 40, step: 8},
    {time: 45, step: 9},
    {time: 48, step: 10},
    {time: 62, step: 11},
    {time: 64, step: 12},
    {time: 74, step: 13},
    {time: 80, step: 14},
    {time: 100, step: 15},
    {time: 113, step: 16},
    {time: 120, step: 17},
    {time: 126, step: 18},
    {time: 130, step: 19},
    {time: 133, step: 20},
];

function playVideo() {
    // Retrieve video
    const video = document.querySelector(".demo-video");

    // Play
    video.play();

    // Retrieve mute button
    const muteBtn = document.getElementById("mute-toggle");

    // Toggle mute
    muteBtn.onclick = () => {
        video.muted = !video.muted;
        muteBtn.classList.toggle("unmuted", !video.muted);
    };

    // Auto-mute when page hidden
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            video.muted = true;
            muteBtn.classList.remove("unmuted");
        }
    });

    // Play script
    // Retrieve script steps
    const steps = document.querySelectorAll(".script-text");

    // Reset steps
    setActiveStep(1);

    // Video time update event listener
    video.addEventListener("timeupdate", () => {
        for (let i = scriptTimeline.length - 1; i >= 0; i--) {
            if (video.currentTime >= scriptTimeline[i].time) {
                setActiveStep(scriptTimeline[i].step);
                break;
            }
        }
    });

    // For app name jump animation on mobile
    let jumpClassRemoved = false;
    let jumpClassAdded = false;

    function setActiveStep(n) {
        // Update active classes for steps
        steps.forEach(s => {
            if (s.dataset.step == n) {
                s.style.display = "block";
                s.classList.add("active");
            } else {
                s.classList.remove("active");
                s.style.display = "none";
            }
        });

        // Trigger jump animation only when the last step first becomes active
        if (n == 20) {
            const lastStep = document.querySelector('.script-text[data-step="20"] .app-link');
            
            if (lastStep) {
                // Remove previous jump class
                if (!jumpClassRemoved) {
                    lastStep.classList.remove("app-jump");
                    void lastStep.offsetWidth;
                    jumpClassRemoved = true;
                }

                // Add jump class
                if (!jumpClassAdded) {
                    lastStep.classList.add("app-jump");
                    jumpClassAdded = true;
                }
            }
        }
    }

    // Replay button
    const replayBtn = document.getElementById("replay-button");

    // While playing video, hide replay button
    video.addEventListener("play", () => {
        replayBtn.style.display = "none";
    });

    // When video ends, show replay button
    video.addEventListener("ended", () => {
        replayBtn.style.display = "block";
    });

    // Click replay button to replay
    replayBtn.addEventListener("click", () => {
        replayBtn.style.display = "none";

        video.currentTime = 0;
        video.play();

        // Hide all script texts
        document.querySelectorAll(".script-text").forEach(s => {
            s.classList.remove("active");
            s.style.display = "none";
        });

        // Restart script
        setActiveStep(1);
    });
}