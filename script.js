const slides = Array.from(document.querySelectorAll(".slide"));
const navLinks = Array.from(document.querySelectorAll(".section-jump a"));
const progressBar = document.getElementById("progressBar");
const sectionLabel = document.getElementById("sectionLabel");
const clock = document.getElementById("clock");

let activeIndex = 0;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function goToSlide(index) {
  const nextIndex = clamp(index, 0, slides.length - 1);
  slides[nextIndex].scrollIntoView({ behavior: "smooth", block: "start" });
}

function updatePresentationState() {
  const scrollMax = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollMax > 0 ? window.scrollY / scrollMax : 0;
  progressBar.style.width = `${clamp(progress, 0, 1) * 100}%`;

  let nearest = 0;
  let nearestDistance = Infinity;
  slides.forEach((slide, index) => {
    const distance = Math.abs(slide.getBoundingClientRect().top);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = index;
    }
  });

  activeIndex = nearest;
  sectionLabel.textContent = slides[activeIndex].dataset.label || `SECTION 0${activeIndex}`;
  navLinks.forEach((link, index) => {
    link.classList.toggle("active", index === activeIndex);
  });
}

function updateClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

window.addEventListener("scroll", updatePresentationState, { passive: true });
window.addEventListener("resize", updatePresentationState);
window.addEventListener("keydown", (event) => {
  const keyMap = {
    ArrowDown: 1,
    ArrowRight: 1,
    PageDown: 1,
    ArrowUp: -1,
    ArrowLeft: -1,
    PageUp: -1,
  };

  if (keyMap[event.key]) {
    event.preventDefault();
    goToSlide(activeIndex + keyMap[event.key]);
  }

  if (event.key === "Home") {
    event.preventDefault();
    goToSlide(0);
  }

  if (event.key === "End") {
    event.preventDefault();
    goToSlide(slides.length - 1);
  }
});

function setupCanvas(canvas) {
  const context = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width: rect.width, height: rect.height };
}

function drawGrid(context, width, height, spacing, color) {
  context.strokeStyle = color;
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += spacing) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += spacing) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

function drawSpectrum(canvas, time, compact = false) {
  const { context, width, height } = setupCanvas(canvas);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#02090d";
  context.fillRect(0, 0, width, height);
  drawGrid(context, width, height, compact ? 32 : 44, "rgba(104, 232, 255, 0.12)");

  const baseline = height * 0.78;
  const peaks = [
    { x: 0.16, amp: 0.42, width: 0.018, speed: 1.1 },
    { x: 0.31, amp: 0.66, width: 0.026, speed: 0.7 },
    { x: 0.52, amp: 0.5, width: 0.02, speed: 1.35 },
    { x: 0.72, amp: 0.78, width: 0.032, speed: 0.95 },
    { x: 0.88, amp: 0.36, width: 0.018, speed: 1.6 },
  ];

  context.save();
  context.beginPath();
  context.moveTo(0, baseline);

  for (let x = 0; x <= width; x += 2) {
    const nx = x / width;
    let y = baseline;
    peaks.forEach((peak, index) => {
      const wobble = Math.sin(time * 0.001 * peak.speed + index) * 0.015;
      const dx = nx - peak.x - wobble;
      y -= Math.exp(-(dx * dx) / peak.width) * peak.amp * height * 0.7;
    });
    y += Math.sin(nx * 52 + time * 0.006) * 4 + Math.sin(nx * 121 + time * 0.002) * 2;
    context.lineTo(x, y);
  }

  context.lineTo(width, baseline);
  context.closePath();
  const fill = context.createLinearGradient(0, height * 0.2, 0, baseline);
  fill.addColorStop(0, "rgba(104, 232, 255, 0.5)");
  fill.addColorStop(1, "rgba(40, 212, 200, 0.03)");
  context.fillStyle = fill;
  context.fill();

  context.beginPath();
  for (let x = 0; x <= width; x += 2) {
    const nx = x / width;
    let y = baseline;
    peaks.forEach((peak, index) => {
      const wobble = Math.sin(time * 0.001 * peak.speed + index) * 0.015;
      const dx = nx - peak.x - wobble;
      y -= Math.exp(-(dx * dx) / peak.width) * peak.amp * height * 0.7;
    });
    y += Math.sin(nx * 52 + time * 0.006) * 4 + Math.sin(nx * 121 + time * 0.002) * 2;
    if (x === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.strokeStyle = "#68e8ff";
  context.lineWidth = compact ? 1.5 : 2.5;
  context.shadowColor = "#68e8ff";
  context.shadowBlur = 12;
  context.stroke();
  context.restore();

  if (!compact) {
    const windowX = width * 0.61;
    const windowW = width * 0.075;
    context.fillStyle = "rgba(40, 212, 200, 0.12)";
    context.strokeStyle = "rgba(40, 212, 200, 0.9)";
    context.lineWidth = 2;
    context.fillRect(windowX, height * 0.12, windowW, height * 0.76);
    context.strokeRect(windowX, height * 0.12, windowW, height * 0.76);
    context.fillStyle = "#9ef8ff";
    context.font = "12px Consolas, monospace";
    context.fillText("CLEAR", windowX + 8, height * 0.18);
    context.fillText("437.8 MHz", windowX + 8, height * 0.23);
  }

  context.fillStyle = "rgba(154, 180, 191, 0.82)";
  context.font = `${compact ? 10 : 13}px Consolas, monospace`;
  context.fillText("-95 dBm", 12, height - 14);
  context.fillText("-35 dBm", 12, 24);
  context.fillText(compact ? "RF SIM" : "SIMULATED POWER SPECTRAL DENSITY", width - (compact ? 58 : 256), 24);
}

function animate(time) {
  const spectrumCanvas = document.getElementById("spectrumCanvas");
  const heroScope = document.getElementById("heroScope");

  if (spectrumCanvas) drawSpectrum(spectrumCanvas, time);
  if (heroScope) drawSpectrum(heroScope, time, true);

  requestAnimationFrame(animate);
}

updateClock();
updatePresentationState();
setInterval(updateClock, 15000);
requestAnimationFrame(animate);
