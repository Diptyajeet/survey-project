const glow = document.querySelector(".cursor-glow");
const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
const scrollButtons = document.querySelectorAll("[data-scroll]");
const sections = navLinks
    .map(link => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

function scrollToTarget(selector) {
    const target = document.querySelector(selector);

    if (target) {
        target.scrollIntoView({ behavior:"smooth", block:"start" });
    }
}

document.addEventListener("mousemove", event => {
    if (!glow) {
        return;
    }

    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
});

navLinks.forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        scrollToTarget(link.getAttribute("href"));
    });
});

scrollButtons.forEach(button => {
    button.addEventListener("click", () => {
        scrollToTarget(button.dataset.scroll);
    });
});

const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) {
            return;
        }

        entry.target.animate(
            [
                { opacity:0, transform:"translateY(34px)" },
                { opacity:1, transform:"translateY(0)" }
            ],
            {
                duration:700,
                easing:"ease",
                fill:"forwards"
            }
        );

        revealObserver.unobserve(entry.target);
    });
}, { threshold:.18 });

document
    .querySelectorAll(".card, .feature-card, .about-copy, .about-panel")
    .forEach(element => revealObserver.observe(element));

const activeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) {
            return;
        }

        navLinks.forEach(link => {
            link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
        });
    });
}, {
    rootMargin:"-45% 0px -45% 0px",
    threshold:0
});

sections.forEach(section => activeObserver.observe(section));
