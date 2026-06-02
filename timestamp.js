document.addEventListener("DOMContentLoaded", () => {
  // --- Mobile Menu Toggle logic ---
  const mobileMenu = document.getElementById("mobile-menu");
  const navLinks = document.querySelector(".nav-links");

  if (mobileMenu) {
    mobileMenu.addEventListener("click", () => {
      navLinks.classList.toggle("active");
      mobileMenu.classList.toggle("is-active");

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

  // --- Core Element Mappings ---
  const dateInput = document.getElementById("date-input");
  const timeInput = document.getElementById("time-input");
  const formatsGrid = document.getElementById("formats-grid");

  // Default to current local parameters safely
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  dateInput.value = `${year}-${month}-${day}`;
  timeInput.value = `${hours}:${minutes}`;

  const formatConfigs = [
    { flag: "F", desc: "Long Date/Time with Day of Week" },
    { flag: "f", desc: "Long Date/Time" },
    { flag: "D", desc: "Long Date" },
    { flag: "d", desc: "Short Date" },
    { flag: "t", desc: "Short Time" },
    { flag: "T", desc: "Long Time" },
    { flag: "R", desc: "Relative Time" },
    { flag: "s", desc: "Short Date/Time String" },
    { flag: "S", desc: "Long Date/Time String" },
  ];

  function getLocalPreviewString(unixSeconds, flag) {
    const dateObj = new Date(unixSeconds * 1000);

    switch (flag) {
      case "t":
        return dateObj.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      case "T":
        return dateObj.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      case "d":
        return dateObj.toLocaleDateString([], {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      case "D":
        return dateObj.toLocaleDateString([], {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      case "f":
        return (
          dateObj.toLocaleDateString([], {
            year: "numeric",
            month: "long",
            day: "numeric",
          }) +
          " at " +
          dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        );
      case "F":
        return (
          dateObj.toLocaleDateString([], {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }) +
          " at " +
          dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        );
      case "s":
        return dateObj.toLocaleString([], {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      case "S":
        return dateObj.toLocaleString([], {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      case "R":
        return calculateRelativeTimeString(dateObj);
      default:
        return dateObj.toLocaleString();
    }
  }

  function calculateRelativeTimeString(targetDate) {
    const deltaSeconds = Math.floor((targetDate - new Date()) / 1000);
    const absDelta = Math.abs(deltaSeconds);

    let value = 0;
    let unit = "";

    if (absDelta < 60) {
      return deltaSeconds >= 0 ? "in a few seconds" : "a few seconds ago";
    } else if (absDelta < 3600) {
      value = Math.floor(absDelta / 60);
      unit = value === 1 ? "minute" : "minutes";
    } else if (absDelta < 86400) {
      value = Math.floor(absDelta / 3600);
      unit = value === 1 ? "hour" : "hours";
    } else {
      value = Math.floor(absDelta / 86400);
      unit = value === 1 ? "day" : "days";
    }

    return deltaSeconds >= 0 ? `in ${value} ${unit}` : `${value} ${unit} ago`;
  }

  function renderTimestamps() {
    const selectedDate = dateInput.value;
    const selectedTime = timeInput.value;

    if (!selectedDate || !selectedTime) return;

    const targetDateTime = new Date(`${selectedDate}T${selectedTime}`);
    const unixSeconds = Math.floor(targetDateTime.getTime() / 1000);

    formatsGrid.innerHTML = "";

    if (isNaN(unixSeconds)) {
      return;
    }

    formatConfigs.forEach((item) => {
      const markdownSyntax = `<t:${unixSeconds}:${item.flag}>`;
      const localPreview = getLocalPreviewString(unixSeconds, item.flag);

      const rowElement = document.createElement("div");
      rowElement.className = "format-row";

      // Forces text conversion parameters explicitly into raw visible text tags
      rowElement.innerHTML = `
          <span class="syntax-tag">&lt;t:${unixSeconds}:${item.flag}&gt;</span>
          <span class="preview-text">${localPreview}</span>
          <button class="copy-btn" data-clipboard="${markdownSyntax}" title="Copy Code">
            <i class="far fa-copy"></i>
          </button>
        `;

      rowElement.addEventListener("click", (e) => {
        if (e.target.closest(".copy-btn")) return;
        executeClipboardCopy(
          markdownSyntax,
          rowElement.querySelector(".copy-btn")
        );
      });

      rowElement.querySelector(".copy-btn").addEventListener("click", (e) => {
        executeClipboardCopy(markdownSyntax, e.currentTarget);
      });

      formatsGrid.appendChild(rowElement);
    });
  }

  function executeClipboardCopy(textToCopy, activeContextBtn) {
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        activeContextBtn.classList.add("success");
        activeContextBtn.innerHTML = '<i class="fas fa-check"></i>';

        setTimeout(() => {
          activeContextBtn.classList.remove("success");
          activeContextBtn.innerHTML = '<i class="far fa-copy"></i>';
        }, 1400);
      })
      .catch((err) => {
        console.error("Clipboard entry write error: ", err);
      });
  }

  // Live recalculations
  dateInput.addEventListener("input", renderTimestamps);
  timeInput.addEventListener("input", renderTimestamps);
  dateInput.addEventListener("change", renderTimestamps);
  timeInput.addEventListener("change", renderTimestamps);

  renderTimestamps();
});
