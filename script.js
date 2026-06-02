document.addEventListener("DOMContentLoaded", () => {
  // --- Mobile Menu Toggle ---
  const mobileMenu = document.getElementById("mobile-menu");
  const navLinks = document.querySelector(".nav-links");

  mobileMenu.addEventListener("click", () => {
    navLinks.classList.toggle("active");
    mobileMenu.classList.toggle("is-active");

    const bars = mobileMenu.querySelectorAll(".bar");
    bars[0].style.transform = mobileMenu.classList.contains("is-active")
      ? "rotate(-45deg) translate(-5px, 6px)"
      : "none";
    bars[1].style.opacity = mobileMenu.classList.contains("is-active")
      ? "0"
      : "1";
    bars[2].style.transform = mobileMenu.classList.contains("is-active")
      ? "rotate(45deg) translate(-5px, -6px)"
      : "none";
  });

  // --- Session Status & Join Button Controller ---
  const sessionDot = document.getElementById("session-dot");
  const sessionText = document.getElementById("session-text");
  const dynamicJoinContainer = document.getElementById(
    "dynamic-join-container"
  );

  function checkSessionStatus() {
    fetch("sessionstatus.txt")
      .then((response) => {
        if (!response.ok) throw new Error("File not found");
        return response.text();
      })
      .then((data) => {
        const status = data.trim();
        if (status === "Yes") {
          sessionText.innerText = "Active";
          sessionText.className = "green-text";
          sessionDot.className = "stat-dot green";

          // Reveal the Join Server button smoothly
          dynamicJoinContainer.classList.remove("hidden");
        } else {
          sessionText.innerText = "Inactive";
          sessionText.className = "red-text";
          sessionDot.className = "stat-dot red";

          // Hide the Join Server button immediately if session is closed
          dynamicJoinContainer.classList.add("hidden");
        }
      })
      .catch((error) => {
        console.log(
          "Could not read sessionstatus.txt, hiding join options.",
          error
        );
        sessionText.innerText = "Inactive";
        sessionText.className = "red-text";
        sessionDot.className = "stat-dot red";
        dynamicJoinContainer.classList.add("hidden");
      });
  }

  // --- Live Member Counter File Reader ---
  const memberElement = document.getElementById("member-count");

  function checkMemberCount() {
    fetch("members.txt")
      .then((response) => {
        if (!response.ok) throw new Error("File not found");
        return response.text();
      })
      .then((data) => {
        memberElement.innerText = data.trim();
      })
      .catch((error) => {
        console.log(
          "Could not read members.txt, defaulting to standard display.",
          error
        );
        memberElement.innerText = "N/A";
      });
  }

  // Run custom checks on initialization
  checkSessionStatus();
  checkMemberCount();

  // Check files automatically for structural modifications every 30 seconds
  setInterval(() => {
    checkSessionStatus();
    checkMemberCount();
  }, 30000);
});

