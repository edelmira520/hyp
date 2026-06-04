const fileInput = document.querySelector("#fileInput");
const exportButton = document.querySelector("#exportButton");
const resetButton = document.querySelector("#resetButton");
const canvas = document.querySelector("#previewCanvas");
const emptyState = document.querySelector("#emptyState");
const imageMeta = document.querySelector("#imageMeta");
const context = canvas.getContext("2d", { willReadFrequently: true });

const controls = {
  patternType: document.querySelector("#patternType"),
  dotSize: document.querySelector("#dotSize"),
  spacing: document.querySelector("#spacing"),
  angle: document.querySelector("#angle"),
  contrast: document.querySelector("#contrast"),
  brightness: document.querySelector("#brightness"),
  monochrome: document.querySelector("#monochrome"),
  invert: document.querySelector("#invert"),
};

const defaults = {
  patternType: "dots",
  dotSize: 7,
  spacing: 12,
  angle: 0,
  contrast: 0,
  brightness: 0,
  monochrome: true,
  invert: false,
};

const sourceCanvas = document.createElement("canvas");
const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
let sourceImage = null;
let renderFrame = null;

function clamp(value, min = 0, max = 255) {
  return Math.min(max, Math.max(min, value));
}

function getSettings() {
  return {
    patternType: controls.patternType.value,
    dotSize: Number(controls.dotSize.value),
    spacing: Number(controls.spacing.value),
    angle: Number(controls.angle.value),
    contrast: Number(controls.contrast.value),
    brightness: Number(controls.brightness.value),
    monochrome: controls.monochrome.checked,
    invert: controls.invert.checked,
  };
}

function updateLabels() {
  for (const [name, input] of Object.entries(controls)) {
    if (input.type !== "range") continue;
    document.querySelector(`#${name}Value`).value = input.value;
  }
}

function adjustChannel(channel, brightness, contrastFactor) {
  const brightened = channel + brightness * 2.55;
  return clamp(contrastFactor * (brightened - 128) + 128);
}

function getSample(pixels, width, height, x, y, settings, contrastFactor) {
  const px = Math.min(width - 1, Math.max(0, Math.floor(x)));
  const py = Math.min(height - 1, Math.max(0, Math.floor(y)));
  const index = (py * width + px) * 4;
  const red = adjustChannel(pixels[index], settings.brightness, contrastFactor);
  const green = adjustChannel(pixels[index + 1], settings.brightness, contrastFactor);
  const blue = adjustChannel(pixels[index + 2], settings.brightness, contrastFactor);
  const alpha = pixels[index + 3] / 255;
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) * alpha;
  const darkness = settings.invert ? luminance / 255 : 1 - luminance / 255;

  return {
    color: settings.monochrome
      ? "#111111"
      : `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`,
    strength: darkness,
  };
}

function drawGridPattern(settings, pixels, width, height, contrastFactor) {
  const { patternType, dotSize, spacing, angle } = settings;
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const centerX = width / 2;
  const centerY = height / 2;
  const extent = Math.hypot(width, height);

  for (let gridY = -extent / 2; gridY < extent / 2; gridY += spacing) {
    for (let gridX = -extent / 2; gridX < extent / 2; gridX += spacing) {
      const x = centerX + gridX * cos - gridY * sin;
      const y = centerY + gridX * sin + gridY * cos;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const sample = getSample(pixels, width, height, x, y, settings, contrastFactor);
      const size = Math.min(sample.strength * dotSize * 2, spacing * 1.42);
      if (size < 0.3) continue;

      context.save();
      context.translate(x, y);
      context.rotate(radians + (patternType === "diamonds" ? Math.PI / 4 : 0));
      context.fillStyle = sample.color;

      if (patternType === "dots") {
        context.beginPath();
        context.arc(0, 0, size / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillRect(-size / 2, -size / 2, size, size);
      }

      context.restore();
    }
  }
}

function drawLinePattern(settings, pixels, width, height, contrastFactor) {
  const { patternType, dotSize, spacing } = settings;
  const horizontal = patternType === "horizontal-lines";

  if (horizontal) {
    for (let y = spacing / 2; y < height; y += spacing) {
      for (let x = spacing / 2; x < width; x += spacing) {
        const sample = getSample(pixels, width, height, x, y, settings, contrastFactor);
        const thickness = Math.min(sample.strength * dotSize, spacing);
        if (thickness < 0.15) continue;

        context.fillStyle = sample.color;
        context.fillRect(x - spacing / 2, y - thickness / 2, spacing + 0.5, thickness);
      }
    }
  } else {
    for (let x = spacing / 2; x < width; x += spacing) {
      for (let y = spacing / 2; y < height; y += spacing) {
        const sample = getSample(pixels, width, height, x, y, settings, contrastFactor);
        const thickness = Math.min(sample.strength * dotSize, spacing);
        if (thickness < 0.15) continue;

        context.fillStyle = sample.color;
        context.fillRect(x - thickness / 2, y - spacing / 2, thickness, spacing + 0.5);
      }
    }
  }
}

function renderHalftone() {
  renderFrame = null;
  if (!sourceImage) return;

  const settings = getSettings();
  const contrastFactor =
    (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const pixels = sourceContext.getImageData(0, 0, width, height).data;

  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  if (settings.patternType.endsWith("lines")) {
    drawLinePattern(settings, pixels, width, height, contrastFactor);
  } else {
    drawGridPattern(settings, pixels, width, height, contrastFactor);
  }
}

function scheduleRender() {
  updateLabels();
  if (!sourceImage || renderFrame) return;
  renderFrame = requestAnimationFrame(renderHalftone);
}

function loadImage(file) {
  if (!file || !file.type.startsWith("image/")) return;

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  image.onload = () => {
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);

    sourceCanvas.width = width;
    sourceCanvas.height = height;
    sourceContext.clearRect(0, 0, width, height);
    sourceContext.drawImage(image, 0, 0, width, height);
    sourceImage = image;

    canvas.style.display = "block";
    emptyState.hidden = true;
    exportButton.disabled = false;
    imageMeta.textContent = `${file.name} · ${width} × ${height}px`;
    renderHalftone();
    URL.revokeObjectURL(objectUrl);
  };

  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    alert("无法读取这张图片，请尝试其他图片格式。");
  };

  image.src = objectUrl;
}

fileInput.addEventListener("change", (event) => {
  loadImage(event.target.files[0]);
  event.target.value = "";
});

for (const input of Object.values(controls)) {
  input.addEventListener("input", scheduleRender);
}

resetButton.addEventListener("click", () => {
  for (const [name, value] of Object.entries(defaults)) {
    if (controls[name].type === "checkbox") {
      controls[name].checked = value;
    } else {
      controls[name].value = value;
    }
  }
  scheduleRender();
});

exportButton.addEventListener("click", () => {
  if (!sourceImage) return;

  const link = document.createElement("a");
  link.download = "halftone-export.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

updateLabels();
