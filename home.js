const carousel = document.querySelector(".hero-carousel");

if (carousel) {
  const track = carousel.querySelector(".carousel-track");
  const slides = [...track.querySelectorAll("img")];
  const dots = [...carousel.querySelectorAll(".carousel-dots button")];
  let activeSlide = 0;
  let renderSlide = 0;
  let timer = null;

  function syncDots() {
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === activeSlide);
    });
  }

  function showSlide(index, animate = true) {
    renderSlide = index;
    activeSlide = ((index % slides.length) + slides.length) % slides.length;
    track.style.transition = animate ? "transform 0.55s ease" : "none";
    track.style.transform = `translateX(-${renderSlide * 100}%)`;
    syncDots();
  }

  function startCarousel() {
    window.clearInterval(timer);
    timer = window.setInterval(() => showSlide(renderSlide + 1), 4200);
  }

  if (slides.length > 1) {
    const firstClone = slides[0].cloneNode(true);
    firstClone.setAttribute("aria-hidden", "true");
    track.appendChild(firstClone);

    track.addEventListener("transitionend", () => {
      if (renderSlide === slides.length) {
        showSlide(0, false);
        track.offsetHeight;
        track.style.transition = "transform 0.55s ease";
      }
    });

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        showSlide(Number(dot.dataset.slide));
        startCarousel();
      });
    });

    showSlide(0);
    startCarousel();
  }
}

const navToggle = document.querySelector(".nav-toggle");
const navDrawer = document.querySelector(".nav-drawer");

if (navToggle && navDrawer) {
  const links = navDrawer.querySelectorAll("a");

  navToggle.addEventListener("click", () => {
    const open = navDrawer.classList.toggle("open");
    navToggle.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  });

  links.forEach((link) => {
    link.addEventListener("click", () => {
      navDrawer.classList.remove("open");
      navToggle.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", (e) => {
    if (!navToggle.contains(e.target) && !navDrawer.contains(e.target)) {
      navDrawer.classList.remove("open");
      navToggle.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}
