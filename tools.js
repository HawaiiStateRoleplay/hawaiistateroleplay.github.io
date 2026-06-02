document.addEventListener("DOMContentLoaded", () => {
  // --- Mobile Menu Toggle Mechanics ---
  const mobileMenu = document.getElementById("mobile-menu");
  const navLinks = document.querySelector(".nav-links");

  if (mobileMenu) {
    mobileMenu.addEventListener("click", () => {
      navLinks.classList.toggle("active");
      mobileMenu.classList.toggle("is-active");

      // Transform CSS lines to build an "X" or reset cleanly
      const bars = mobileMenu.querySelectorAll(".bar");
      if (navLinks.classList.contains("active")) {
        bars[0].style.transform = "rotate(-45deg) translate(-5px, 6px)";
        bars[1].style.opacity = "0";
        bars[2].style.transform = "rotate(45deg) translate(-5px, -6px)";
      } else {
        bars[0].style.transform = "none";
        bars[1].style.opacity = "1";
        bars[2].style.transform = "none";
      }
    });
  }
});

