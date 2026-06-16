const board = document.querySelector("#collageCanvas");
const ctx = board.getContext("2d");
const material = document.querySelector("#materialCanvas");
const mtx = material.getContext("2d");

const LIBRARY_CACHE_BUST = Date.now();

const phraseInput = document.querySelector("#phraseInput");
const imageUpload = document.querySelector("#imageUpload");
const libraryUpload = document.querySelector("#libraryUpload");
const materialLibrary = document.querySelector("#materialLibrary");
const libraryTabs = document.querySelectorAll("[data-library-tab]");
const librarySearch = document.querySelector("#librarySearch");
const librarySubtitle = document.querySelector("#librarySubtitle");
const libraryFolderHint = document.querySelector("#libraryFolderHint");
const libraryCount = document.querySelector("#libraryCount");
const libraryPanelSummary = document.querySelector("#libraryPanelSummary");
const libraryModal = document.querySelector("#libraryModal");
const openLibrary = document.querySelector("#openLibrary");
const closeLibrary = document.querySelector("#closeLibrary");
const brushColor = document.querySelector("#brushColor");
const brushSize = document.querySelector("#brushSize");
const brushStyleButtons = document.querySelectorAll("[data-brush-style]");
const strokeColor = document.querySelector("#strokeColor");
const strokeSize = document.querySelector("#strokeSize");
const textColor = document.querySelector("#textColor");
const textFillColor = document.querySelector("#textFillColor");
const noFillSelected = document.querySelector("#noFillSelected");
const selectedStrokeColor = document.querySelector("#selectedStrokeColor");
const selectedStrokeSize = document.querySelector("#selectedStrokeSize");
const noStrokeSelected = document.querySelector("#noStrokeSelected");
const selectedOpacity = document.querySelector("#selectedOpacity");
const layerList = document.querySelector("#layerList");
const styleContext = document.querySelector("#styleContext");
const selectedStyleControls = document.querySelectorAll("[data-selected-style]");
const snapshotState = document.querySelector("#snapshotState");
const undoAction = document.querySelector("#undoAction");
const redoAction = document.querySelector("#redoAction");
const cropImage = document.querySelector("#cropImage");
const freeCutImage = document.querySelector("#freeCutImage");
const applyCropImage = document.querySelector("#applyCropImage");
const cancelCropImage = document.querySelector("#cancelCropImage");
const resetImage = document.querySelector("#resetImage");

const BW = board.width;
const BH = board.height;
const MW = material.width;
const MH = material.height;

let items = [];
let selectedId = null;
let activeTool = "select";
let dragState = null;
let cutState = null;
let frameState = null;
let brushState = null;
let draggedLayerId = null;
let sourceImage = new Image();
let sourceReady = false;
let sourceView = { x: 0, y: 0, w: MW, h: MH };
let noiseDots = [];
let historyStack = [];
let historyIndex = -1;
let isRestoringHistory = false;
let boardBackground = null;
let libraryQuery = "";
let imageCutMode = null;
let imageCutState = null;
let imageCutDragState = null;
let activeBrushStyle = "pen";

const palette = ["#fffefa", "#f06a22", "#49a897", "#d9f262", "#e8e8e2", "#111111"];
const materialTabs = {
  labels: {
    subtitle: "trademark / washing label assets",
    folder: "labels",
    kind: "object",
    assets: [],
  },
  papers: {
    subtitle: "paper background textures",
    folder: "papers",
    kind: "background",
    assets: [],
  },
  decorations: {
    subtitle: "marks / tape / graphic ornaments",
    folder: "decorations",
    kind: "object",
    assets: [],
  },
};
let activeMaterialTab = "labels";

const fallbackMaterialLibrary = {
  labels: [
    { name: "Care Label", file: "care-label.svg" },
    { name: "Barcode Tag", file: "barcode-tag.svg" },
    { name: "Warning Label", file: "warning-label.svg" },
    { name: "CHANEL", file: "CHANEL.jpg", tags: ["trademark", "luxury", "label", "brand"] },
    { name: "DIOR", file: "DIOR.jpg", tags: ["trademark", "luxury", "label", "brand"] },
    { name: "GUESS", file: "GUESS.jpg", tags: ["trademark", "fashion", "label", "brand"] },
    { name: "HERMES", file: "HERMES.jpg", tags: ["trademark", "luxury", "label", "brand"] },
    { name: "LOUIS VUITTON", file: "LOUIS VUITTON.jpg", tags: ["trademark", "luxury", "label", "brand"] },
    { name: "PLAY", file: "PLAY.jpg", tags: ["trademark", "fashion", "label", "brand"] },
    { name: "SYMBOL", file: "SYMBOL.jpg", tags: ["symbol", "trademark", "label", "brand"] },
    { name: "Trademark Fragment", file: "c6ead68ec5a34495d313a5a51200e807.jpg", tags: ["trademark", "label", "brand"] },
  ],
  papers: [
    { name: "Paper Texture 01", file: "1e65461f0022ce0adc0569a1c0baea6a.jpg", tags: ["paper", "background", "texture"] },
    { name: "Paper Texture 02", file: "c9fd16aa78a45938def5aab45e0867fd.jpg", tags: ["paper", "background", "texture"] },
    { name: "Paper Texture 03", file: "625fd8839b65dcbc54f9ba6adf9e07ab.jpg", tags: ["paper", "background", "texture"] },
    { name: "Paper Texture 04", file: "a7cc647f887180ecc67d9cf4865662fe.jpg", tags: ["paper", "background", "texture"] },
    { name: "Paper Texture 05", file: "7d0919bb2062fbd9a85aabade779eb65.jpg", tags: ["paper", "background", "texture"] },
  ],
  decorations: [
    { name: "Black Tape Strip", file: "black-tape-strip.svg" },
    { name: "Orange Crop Mark", file: "orange-crop-mark.svg" },
    { name: "Plastic Warning Ring", file: "plastic-warning-ring.svg" },
  ],
};

const seedFragments = [];

function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function makeTextItem(options) {
  const text = options.text || "label fragment";
  const size = options.size || 28;
  ctx.save();
  ctx.font = `${options.weight || 800} ${size}px Helvetica Neue, Arial, sans-serif`;
  const width = Math.max(ctx.measureText(text).width + 28, 86);
  ctx.restore();
  return {
    id: makeId("text"),
    type: "text",
    text,
    x: options.x ?? 170 + Math.random() * 620,
    y: options.y ?? 240 + Math.random() * 760,
    w: options.w || width,
    h: options.h || size * 1.72,
    rotation: options.rotation ?? (Math.random() - 0.5) * 0.18,
    size,
    fill: options.fill || "#fffefa",
    color: options.color || "#111111",
    weight: options.weight || 800,
    outline: true,
    strokeColor: options.strokeColor || "#111111",
    strokeWidth: options.strokeWidth ?? 1.5,
  };
}

function createNoise() {
  noiseDots = Array.from({ length: 1900 }, () => ({
    x: Math.random() * BW,
    y: Math.random() * BH,
    a: Math.random() * 0.035,
  }));
}

function drawPaper() {
  ctx.fillStyle = "#fffefa";
  ctx.fillRect(0, 0, BW, BH);

  if (boardBackground?.img) {
    const scale = Math.max(BW / boardBackground.img.naturalWidth, BH / boardBackground.img.naturalHeight);
    const w = boardBackground.img.naturalWidth * scale;
    const h = boardBackground.img.naturalHeight * scale;
    ctx.drawImage(boardBackground.img, (BW - w) / 2, (BH - h) / 2, w, h);
  }

  noiseDots.forEach((dot) => {
    ctx.fillStyle = `rgba(0,0,0,${dot.a})`;
    ctx.fillRect(dot.x, dot.y, 1, 1);
  });
}

function drawImageItem(item) {
  ctx.save();
  ctx.beginPath();
  if (item.mask?.length) {
    item.mask.forEach((point, index) => {
      const px = -item.w / 2 + point.x * item.w;
      const py = -item.h / 2 + point.y * item.h;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.clip();
  }
  ctx.drawImage(item.img, item.sx, item.sy, item.sw, item.sh, -item.w / 2, -item.h / 2, item.w, item.h);
  ctx.restore();
}

function cropInfo(item) {
  return item.crop || { x: 0, y: 0, w: 1, h: 1 };
}

function originalImageSource(item) {
  return item.original || {
    sx: item.sx,
    sy: item.sy,
    sw: item.sw,
    sh: item.sh,
    w: item.w,
    h: item.h,
  };
}

function cropEditorBounds(item) {
  const crop = cropInfo(item);
  const fullW = item.w / crop.w;
  const fullH = item.h / crop.h;
  const fullCenterX = (0.5 - (crop.x + crop.w / 2)) * fullW;
  const fullCenterY = (0.5 - (crop.y + crop.h / 2)) * fullH;
  return {
    x: fullCenterX - fullW / 2,
    y: fullCenterY - fullH / 2,
    w: fullW,
    h: fullH,
  };
}

function drawCropEditingImage(item) {
  const source = originalImageSource(item);
  const bounds = cropEditorBounds(item);
  const rect = imageCutState?.rect || { x: -item.w / 2, y: -item.h / 2, w: item.w, h: item.h };

  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.drawImage(item.img, source.sx, source.sy, source.sw, source.sh, bounds.x, bounds.y, bounds.w, bounds.h);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  const r = normalizedRect(rect);
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.drawImage(item.img, source.sx, source.sy, source.sw, source.sh, bounds.x, bounds.y, bounds.w, bounds.h);
  ctx.restore();
}

function drawImageMaskStroke(item) {
  if (!item.mask?.length) return false;
  ctx.beginPath();
  item.mask.forEach((point, index) => {
    const px = -item.w / 2 + point.x * item.w;
    const py = -item.h / 2 + point.y * item.h;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.stroke();
  return true;
}

function drawPathItem(item) {
  if (item.points.length < 2) return;
  ctx.save();
  const style = item.brushStyle || "pen";
  ctx.strokeStyle = item.color;
  ctx.lineWidth = item.size;
  ctx.lineCap = style === "pen" ? "butt" : "round";
  ctx.lineJoin = style === "pen" ? "miter" : "round";
  ctx.globalAlpha = (item.opacity ?? 1) * (style === "marker" ? 0.58 : style === "watercolor" ? 0.34 : 1);
  ctx.beginPath();
  item.points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  if (style === "watercolor") {
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = item.size * 1.8;
    ctx.stroke();
  }
  if (style === "oil") {
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = item.size * 0.48;
    [-3, 3].forEach((offset) => {
      ctx.beginPath();
      item.points.forEach((point, index) => {
        const jitter = index % 2 === 0 ? offset : -offset;
        if (index === 0) ctx.moveTo(point.x + jitter, point.y - offset);
        else ctx.lineTo(point.x + jitter, point.y - offset);
      });
      ctx.stroke();
    });
  }
  ctx.restore();
}

function drawFrameItem(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);
  ctx.globalAlpha = item.opacity ?? 1;
  ctx.fillStyle = "rgba(255,255,255,0)";
  ctx.strokeStyle = item.strokeColor;
  ctx.lineWidth = item.strokeWidth;
  ctx.setLineDash(item.dashed ? [18, 10] : []);
  ctx.strokeRect(-item.w / 2, -item.h / 2, item.w, item.h);
  ctx.restore();
}

function drawSelectionHandles(item) {
  if (item.type === "path") return;
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);
  ctx.strokeStyle = "#f06a22";
  ctx.lineWidth = 5;
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(-item.w / 2 - 8, -item.h / 2 - 8, item.w + 16, item.h + 16);
  ctx.setLineDash([]);

  ctx.strokeStyle = "#f06a22";
  ctx.fillStyle = "#fffefa";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -item.h / 2 - 8);
  ctx.lineTo(0, -item.h / 2 - 70);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -item.h / 2 - 78, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f06a22";
  ctx.strokeStyle = "#fffefa";
  ctx.lineWidth = 3;
  [
    [-item.w / 2 - 25, -item.h / 2 - 25],
    [item.w / 2 + 1, -item.h / 2 - 25],
    [-item.w / 2 - 25, item.h / 2 + 1],
    [item.w / 2 + 1, item.h / 2 + 1],
  ].forEach(([x, y]) => {
    ctx.fillRect(x, y, 24, 24);
    ctx.strokeRect(x, y, 24, 24);
  });
  ctx.restore();
}

function drawImageCutPreview() {
  if (!imageCutState) return;
  const item = getSelected();
  if (!item || item.id !== imageCutState.itemId) return;
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);
  ctx.strokeStyle = "#f06a22";
  ctx.lineWidth = 5;
  ctx.setLineDash([14, 10]);
  if (imageCutState.rect) {
    const r = imageCutState.rect;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.setLineDash([]);
    ctx.fillStyle = "#fffefa";
    ctx.strokeStyle = "#f06a22";
    ctx.lineWidth = 4;
    cropCorners(r).forEach((corner) => {
      ctx.fillRect(corner.x - 10, corner.y - 10, 20, 20);
      ctx.strokeRect(corner.x - 10, corner.y - 10, 20, 20);
    });
  }
  if (imageCutState.points?.length) {
    ctx.beginPath();
    imageCutState.points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }
  ctx.restore();
}

function drawObjectItem(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);
  ctx.globalAlpha = item.opacity ?? 1;

  if (item.type === "image") {
    if (imageCutMode === "crop" && item.id === selectedId) drawCropEditingImage(item);
    else drawImageItem(item);
  }

  if (item.type === "text") {
    if (item.fill !== "transparent") {
      ctx.fillStyle = item.fill;
      ctx.fillRect(-item.w / 2, -item.h / 2, item.w, item.h);
    }
    ctx.font = `${item.weight} ${item.size}px Helvetica Neue, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, 0, 1, item.w - 16);
  }

  if (item.outline && (item.strokeWidth ?? 2) > 0 && !(imageCutMode && item.type === "image")) {
    ctx.strokeStyle = item.strokeColor || "#111";
    ctx.lineWidth = item.strokeWidth ?? 2;
    if (!(item.type === "image" && drawImageMaskStroke(item))) {
      ctx.strokeRect(-item.w / 2, -item.h / 2, item.w, item.h);
    }
  }

  ctx.restore();

  if (item.id === selectedId && !(imageCutMode && item.type === "image")) drawSelectionHandles(item);
}

function draw() {
  drawPaper();
  items.forEach((item) => {
    if (item.hidden) return;
    if (item.type === "path") drawPathItem(item);
    else if (item.type === "frame") {
      drawFrameItem(item);
      if (item.id === selectedId && !imageCutMode) drawSelectionHandles(item);
    }
    else drawObjectItem(item);
  });
  if (frameState?.preview) drawFrameItem(frameState.preview);
  drawImageCutPreview();
  renderLayers();
}

function cloneItem(item) {
  return {
    ...item,
    points: item.points ? item.points.map((point) => ({ ...point })) : undefined,
    mask: item.mask ? item.mask.map((point) => ({ ...point })) : undefined,
    crop: item.crop ? { ...item.crop } : undefined,
    original: item.original ? { ...item.original, mask: item.original.mask ? item.original.mask.map((point) => ({ ...point })) : undefined } : undefined,
  };
}

function captureState() {
  return {
    items: items.map(cloneItem),
    selectedId,
    boardBackground,
  };
}

function restoreState(state) {
  items = state.items.map(cloneItem);
  selectedId = state.selectedId;
  boardBackground = state.boardBackground || null;
  draw();
  renderMaterialLibrary();
}

function updateHistoryButtons() {
  if (undoAction) undoAction.disabled = historyIndex <= 0;
  if (redoAction) redoAction.disabled = historyIndex >= historyStack.length - 1;
}

function commitHistory() {
  if (isRestoringHistory) return;
  historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(captureState());
  if (historyStack.length > 60) {
    historyStack.shift();
    historyIndex = historyStack.length - 1;
  } else {
    historyIndex += 1;
  }
  updateHistoryButtons();
}

function undoHistory() {
  if (historyIndex <= 0) return;
  historyIndex -= 1;
  isRestoringHistory = true;
  restoreState(historyStack[historyIndex]);
  isRestoringHistory = false;
  updateHistoryButtons();
}

function redoHistory() {
  if (historyIndex >= historyStack.length - 1) return;
  historyIndex += 1;
  isRestoringHistory = true;
  restoreState(historyStack[historyIndex]);
  isRestoringHistory = false;
  updateHistoryButtons();
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  words.forEach((word, index) => {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > maxWidth && index > 0) {
      ctx.fillText(line, x, y);
      line = `${word} `;
      y += lineHeight;
    } else {
      line = test;
    }
  });
  ctx.fillText(line, x, y);
}

function boardPoint(event) {
  const rect = board.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (board.width / rect.width),
    y: (event.clientY - rect.top) * (board.height / rect.height),
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function materialPoint(event) {
  const rect = material.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (material.width / rect.width),
    y: (event.clientY - rect.top) * (material.height / rect.height),
  };
}

function canvasToSource(point) {
  const sx = (point.x - sourceView.x) / sourceView.w * sourceImage.naturalWidth;
  const sy = (point.y - sourceView.y) / sourceView.h * sourceImage.naturalHeight;
  return {
    x: Math.max(0, Math.min(sourceImage.naturalWidth, sx)),
    y: Math.max(0, Math.min(sourceImage.naturalHeight, sy)),
  };
}

function containsPoint(item, point) {
  if (item.type === "path") {
    return item.points.some((p) => Math.hypot(p.x - point.x, p.y - point.y) <= Math.max(10, item.size));
  }
  const local = localPoint(item, point);
  return Math.abs(local.x) <= item.w / 2 && Math.abs(local.y) <= item.h / 2;
}

function localPoint(item, point) {
  const cos = Math.cos(-item.rotation);
  const sin = Math.sin(-item.rotation);
  const dx = point.x - item.x;
  const dy = point.y - item.y;
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos,
  };
}

function selectedHandleAt(point) {
  const selected = getSelected();
  if (!selected || selected.type === "path") return null;
  const local = localPoint(selected, point);
  const scaleHandles = [
    { x: -selected.w / 2 - 13, y: -selected.h / 2 - 13 },
    { x: selected.w / 2 + 13, y: -selected.h / 2 - 13 },
    { x: -selected.w / 2 - 13, y: selected.h / 2 + 13 },
    { x: selected.w / 2 + 13, y: selected.h / 2 + 13 },
  ];
  if (scaleHandles.some((handle) => Math.abs(local.x - handle.x) <= 24 && Math.abs(local.y - handle.y) <= 24)) return "scale";
  if (Math.hypot(local.x, local.y - (-selected.h / 2 - 78)) <= 34) return "rotate";
  return null;
}

function selectedOutlineAt(point) {
  const selected = getSelected();
  if (!selected || selected.type === "path") return false;
  const local = localPoint(selected, point);
  const outerX = selected.w / 2 + 14;
  const outerY = selected.h / 2 + 14;
  const innerX = Math.max(0, selected.w / 2 - 18);
  const innerY = Math.max(0, selected.h / 2 - 18);
  const insideOuter = Math.abs(local.x) <= outerX && Math.abs(local.y) <= outerY;
  const insideInner = Math.abs(local.x) < innerX && Math.abs(local.y) < innerY;
  return insideOuter && !insideInner;
}

function normalizedRect(rect) {
  const x = rect.w < 0 ? rect.x + rect.w : rect.x;
  const y = rect.h < 0 ? rect.y + rect.h : rect.y;
  return { x, y, w: Math.abs(rect.w), h: Math.abs(rect.h) };
}

function cropCorners(rect) {
  const r = normalizedRect(rect);
  return [
    { name: "nw", x: r.x, y: r.y },
    { name: "ne", x: r.x + r.w, y: r.y },
    { name: "sw", x: r.x, y: r.y + r.h },
    { name: "se", x: r.x + r.w, y: r.y + r.h },
  ];
}

function cropHitAt(local, rect) {
  const corner = cropCorners(rect).find((point) => Math.abs(local.x - point.x) <= 24 && Math.abs(local.y - point.y) <= 24);
  if (corner) return corner.name;
  const r = normalizedRect(rect);
  if (local.x >= r.x && local.x <= r.x + r.w && local.y >= r.y && local.y <= r.y + r.h) return "move";
  return null;
}

function clampCropRect(rect, bounds) {
  let r = normalizedRect(rect);
  r.w = Math.max(18, Math.min(r.w, bounds.w));
  r.h = Math.max(18, Math.min(r.h, bounds.h));
  r.x = clamp(r.x, bounds.x, bounds.x + bounds.w - r.w);
  r.y = clamp(r.y, bounds.y, bounds.y + bounds.h - r.h);
  return r;
}

function getSelected() {
  return items.find((item) => item.id === selectedId);
}

function setSelectedStyleVisibility(selected) {
  selectedStyleControls.forEach((control) => {
    const type = control.dataset.selectedStyle;
    let visible = false;
    if (!selected) visible = type === "empty";
    else if (type === "common") visible = !imageCutMode;
    else if (type === "text") visible = selected.type === "text";
    else if (type === "image") visible = selected.type === "image" && !imageCutMode;
    else if (type === "image-reset") visible = selected.type === "image" && !imageCutMode;
    else if (type === "crop") visible = selected.type === "image" && imageCutMode === "crop";
    else if (type === "stroke") visible = !imageCutMode && (selected.type === "path" || selected.type === "frame" || selected.type === "text" || selected.type === "image");
    control.classList.toggle("active", visible);
  });
}

function syncRangeProgress(input) {
  if (!input) return;
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value || 0);
  const progress = max === min ? 0 : ((value - min) / (max - min)) * 100;
  input.style.setProperty("--range-progress", `${Math.max(0, Math.min(100, progress))}%`);
}

function syncAllRangeProgress() {
  document.querySelectorAll('input[type="range"]').forEach(syncRangeProgress);
}

function syncSelectedControls() {
  const selected = getSelected();
  setSelectedStyleVisibility(selected);
  if (!selected) {
    if (styleContext && activeTool === "select") styleContext.textContent = "select";
    return;
  }
  if (styleContext && activeTool === "select") {
    if (imageCutMode === "crop") styleContext.textContent = "crop image";
    else if (imageCutMode === "free") styleContext.textContent = "free cut image";
    else styleContext.textContent = selected.type;
  }
  const activeStrokeWidth = selected.type === "path" ? selected.size : selected.strokeWidth ?? 0;
  if (selectedStrokeColor) selectedStrokeColor.value = selected.type === "path" ? selected.color || "#111111" : selected.strokeColor || "#111111";
  if (selectedStrokeSize) selectedStrokeSize.value = String(activeStrokeWidth);
  if (selectedOpacity) selectedOpacity.value = String(Math.round((selected.opacity ?? 1) * 100));
  syncRangeProgress(selectedStrokeSize);
  syncRangeProgress(selectedOpacity);
  setNoStrokeActive(activeStrokeWidth <= 0 || (selected.outline === false && selected.type !== "path"));
  if (selected.type === "text") {
    if (phraseInput) phraseInput.value = selected.text;
    if (textColor) textColor.value = selected.color || "#111111";
    if (textFillColor && selected.fill !== "transparent") textFillColor.value = selected.fill || "#fffefa";
    setNoFillActive(selected.fill === "transparent");
  }
}

function currentStrokeColor() {
  return strokeColor.value;
}

function currentStrokeWidth() {
  return Number(strokeSize.value);
}

function currentSelectedStrokeColor() {
  return selectedStrokeColor?.value || "#111111";
}

function currentSelectedStrokeWidth() {
  return Number(selectedStrokeSize?.value ?? 2);
}

function isNoFillActive() {
  return noFillSelected?.getAttribute("aria-pressed") === "true";
}

function setNoFillActive(active) {
  noFillSelected?.setAttribute("aria-pressed", String(active));
  if (textFillColor) textFillColor.disabled = active;
}

function isNoStrokeActive() {
  return noStrokeSelected?.getAttribute("aria-pressed") === "true";
}

function setNoStrokeActive(active) {
  noStrokeSelected?.setAttribute("aria-pressed", String(active));
  if (selectedStrokeColor) selectedStrokeColor.disabled = active;
  if (selectedStrokeSize) selectedStrokeSize.disabled = active;
}

function setTool(tool) {
  activeTool = tool;
  imageCutMode = null;
  imageCutState = null;
  imageCutDragState = null;
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
  board.classList.toggle("brush-cursor", tool === "brush");
  board.classList.toggle("frame-cursor", tool === "frame");
  board.classList.remove("cut-cursor");
  syncStylePanel(tool);
}

function syncStylePanel(tool) {
  document.querySelectorAll("[data-style-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.stylePanel === tool);
  });
  if (tool === "select") {
    syncSelectedControls();
    return;
  }
  if (styleContext) {
    if (imageCutMode === "crop") styleContext.textContent = "crop image";
    else if (imageCutMode === "free") styleContext.textContent = "free cut image";
    else styleContext.textContent = tool;
  }
}

function loadSource(src) {
  sourceReady = false;
  sourceImage = new Image();
  sourceImage.onload = () => {
    sourceReady = true;
    fitSourceView();
    drawMaterial();
  };
  sourceImage.src = src;
}

function renderMaterialLibrary() {
  if (!materialLibrary) return;
  const tab = materialTabs[activeMaterialTab];
  if (librarySubtitle) librarySubtitle.textContent = tab.subtitle;
  if (libraryFolderHint) libraryFolderHint.textContent = `assets/material-library/${tab.folder}`;
  libraryTabs.forEach((button) => {
    const isActive = button.dataset.libraryTab === activeMaterialTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  if (libraryPanelSummary) {
    libraryPanelSummary.textContent = Object.values(materialTabs)
      .map((category) => category.assets.length)
      .reduce((total, count) => total + count, 0) + " materials available";
  }
  materialLibrary.innerHTML = "";
  const query = libraryQuery.trim().toLowerCase();
  const visibleAssets = tab.assets.filter((asset) => {
    if (!query) return true;
    return [asset.name, asset.file, ...(asset.tags || [])].some((value) => {
      return String(value || "").toLowerCase().includes(query);
    });
  });
  if (libraryCount) {
    const suffix = query ? ` matching "${libraryQuery.trim()}"` : "";
    libraryCount.textContent = `${visibleAssets.length} / ${tab.assets.length} materials${suffix}`;
  }
  visibleAssets.forEach((asset) => {
    const card = document.createElement("article");
    card.className = `material-card ${tab.kind === "background" ? "paper-card" : ""}`;
    if (tab.kind === "background" && boardBackground?.src === asset.src) {
      card.classList.add("active");
    }
    const picker = document.createElement("button");
    picker.type = "button";
    picker.className = "material-pick";
    picker.innerHTML = `<img src="${asset.src}" alt=""><span>${asset.name}</span>`;
    picker.querySelector("img").alt = asset.name;
    picker.addEventListener("click", () => {
      if (tab.kind === "background") setBoardBackground(asset);
      else placeMaterialAsset(asset);
      closeLibraryModal();
    });
    card.append(picker);
    materialLibrary.appendChild(card);
  });
  if (!visibleAssets.length) {
    const empty = document.createElement("p");
    empty.className = "empty-library";
    empty.textContent = tab.assets.length ? "No materials match this search." : "Add files to this folder and update manifest.json.";
    materialLibrary.appendChild(empty);
  }
}

function openLibraryModal() {
  if (!libraryModal) return;
  libraryModal.hidden = false;
  document.body.classList.add("library-open");
  renderMaterialLibrary();
  librarySearch?.focus();
}

function closeLibraryModal() {
  if (!libraryModal) return;
  libraryModal.hidden = true;
  document.body.classList.remove("library-open");
  openLibrary?.focus();
}

function addMaterialAsset(asset, tabName = activeMaterialTab) {
  if (!asset.src) return;
  const exists = materialTabs[tabName].assets.some((item) => item.src === asset.src);
  if (exists) return;
  materialTabs[tabName].assets.push(asset);
  renderMaterialLibrary();
}

function materialAssetFromManifest(asset, tab) {
  const src = asset.file
    ? `assets/material-library/${tab.folder}/${encodeURIComponent(asset.file)}`
    : asset.thumbnail;
  return {
    name: asset.name || asset.file,
    file: asset.file,
    tags: asset.tags || [],
    src,
    download: asset.download || src,
  };
}

function addManifestAssets(assets, tabName, tab) {
  assets.forEach((asset) => {
    addMaterialAsset(materialAssetFromManifest(asset, tab), tabName);
  });
}

function storeOriginalImageState(item) {
  item.crop = item.crop || { x: 0, y: 0, w: 1, h: 1 };
  item.original = {
    sx: item.sx,
    sy: item.sy,
    sw: item.sw,
    sh: item.sh,
    w: item.w,
    h: item.h,
    rotation: item.rotation || 0,
    mask: item.mask ? item.mask.map((point) => ({ ...point })) : undefined,
    outline: item.outline,
    strokeColor: item.strokeColor,
    strokeWidth: item.strokeWidth,
    crop: { ...item.crop },
  };
  return item;
}

function loadMaterialLibrary() {
  Object.entries(materialTabs).forEach(([tabName, tab]) => {
    fetch(`assets/material-library/${tab.folder}/manifest.json?v=${LIBRARY_CACHE_BUST}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((assets) => {
        addManifestAssets(assets, tabName, tab);
      })
      .catch(() => {
        addManifestAssets(fallbackMaterialLibrary[tabName] || [], tabName, tab);
        renderMaterialLibrary();
      });
  });
}

function setBoardBackground(asset) {
  const img = new Image();
  img.onload = () => {
    boardBackground = {
      img,
      name: asset.name,
      src: asset.src,
    };
    selectedId = null;
    setTool("select");
    draw();
    renderMaterialLibrary();
    commitHistory();
  };
  img.src = asset.src;
}

function placeMaterialAsset(asset) {
  const img = new Image();
  img.onload = () => {
    const itemW = Math.min(420, img.naturalWidth);
    items.push(storeOriginalImageState({
      id: makeId("asset"),
      type: "image",
      img,
      sx: 0,
      sy: 0,
      sw: img.naturalWidth,
      sh: img.naturalHeight,
      x: 520 + Math.random() * 120,
      y: 620 + Math.random() * 120,
      w: itemW,
      h: itemW * (img.naturalHeight / img.naturalWidth),
      rotation: 0,
      outline: true,
      strokeColor: currentStrokeColor(),
      strokeWidth: currentStrokeWidth(),
    }));
    selectedId = items.at(-1).id;
    setTool("select");
    draw();
    commitHistory();
  };
  img.src = asset.src;
}

function fitSourceView() {
  const scale = Math.min(MW / sourceImage.naturalWidth, MH / sourceImage.naturalHeight);
  const w = sourceImage.naturalWidth * scale;
  const h = sourceImage.naturalHeight * scale;
  sourceView = { x: (MW - w) / 2, y: (MH - h) / 2, w, h };
}

function drawMaterial() {
  mtx.fillStyle = "#f3f2ed";
  mtx.fillRect(0, 0, MW, MH);
  mtx.strokeStyle = "rgba(255,255,255,0.9)";
  mtx.lineWidth = 2;
  for (let x = 0; x < MW; x += 65) {
    mtx.beginPath();
    mtx.moveTo(x, 0);
    mtx.lineTo(x, MH);
    mtx.stroke();
  }
  for (let y = 0; y < MH; y += 65) {
    mtx.beginPath();
    mtx.moveTo(0, y);
    mtx.lineTo(MW, y);
    mtx.stroke();
  }
  if (sourceReady) {
    mtx.drawImage(sourceImage, sourceView.x, sourceView.y, sourceView.w, sourceView.h);
  }
  if (cutState?.rect) {
    const r = cutState.rect;
    mtx.strokeStyle = "#f06a22";
    mtx.lineWidth = 4;
    mtx.setLineDash([12, 8]);
    mtx.strokeRect(r.x, r.y, r.w, r.h);
    mtx.setLineDash([]);
  }
  if (cutState?.points?.length) {
    mtx.strokeStyle = "#f06a22";
    mtx.lineWidth = 4;
    mtx.beginPath();
    cutState.points.forEach((point, index) => {
      if (index === 0) mtx.moveTo(point.x, point.y);
      else mtx.lineTo(point.x, point.y);
    });
    mtx.stroke();
  }
}

function cutRectangle(rect) {
  if (!sourceReady || Math.abs(rect.w) < 12 || Math.abs(rect.h) < 12) return;
  const x = rect.w < 0 ? rect.x + rect.w : rect.x;
  const y = rect.h < 0 ? rect.y + rect.h : rect.y;
  const w = Math.abs(rect.w);
  const h = Math.abs(rect.h);
  const a = canvasToSource({ x, y });
  const b = canvasToSource({ x: x + w, y: y + h });
  const sw = Math.max(1, b.x - a.x);
  const sh = Math.max(1, b.y - a.y);
  const itemW = Math.min(480, sw * 0.8);
  const itemH = itemW * (sh / sw);
  items.push(storeOriginalImageState({
    id: makeId("cut"),
    type: "image",
    img: sourceImage,
    sx: a.x,
    sy: a.y,
    sw,
    sh,
    x: 520 + Math.random() * 120,
    y: 600 + Math.random() * 120,
    w: itemW,
    h: itemH,
    rotation: 0,
    outline: true,
    strokeColor: currentStrokeColor(),
    strokeWidth: currentStrokeWidth(),
  }));
  selectedId = items.at(-1).id;
  draw();
  commitHistory();
}

function cutFree(points) {
  if (!sourceReady || points.length < 4) return;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x;
  const h = Math.max(...ys) - y;
  if (w < 14 || h < 14) return;
  const a = canvasToSource({ x, y });
  const b = canvasToSource({ x: x + w, y: y + h });
  const sw = Math.max(1, b.x - a.x);
  const sh = Math.max(1, b.y - a.y);
  const itemW = Math.min(460, sw * 0.9);
  const mask = points.map((point) => ({ x: (point.x - x) / w, y: (point.y - y) / h }));
  items.push(storeOriginalImageState({
    id: makeId("freecut"),
    type: "image",
    img: sourceImage,
    sx: a.x,
    sy: a.y,
    sw,
    sh,
    x: 540 + Math.random() * 120,
    y: 620 + Math.random() * 120,
    w: itemW,
    h: itemW * (sh / sw),
    mask,
    rotation: 0,
    outline: currentStrokeWidth() > 0,
    strokeColor: currentStrokeColor(),
    strokeWidth: currentStrokeWidth(),
  }));
  selectedId = items.at(-1).id;
  draw();
  commitHistory();
}

function startImageCut(mode) {
  const selected = getSelected();
  if (!selected || selected.type !== "image") return;
  setTool("select");
  imageCutMode = mode;
  imageCutDragState = null;
  board.classList.add("cut-cursor");
  if (mode === "crop") {
    imageCutState = {
      itemId: selected.id,
      rect: {
        x: -selected.w / 2,
        y: -selected.h / 2,
        w: selected.w,
        h: selected.h,
      },
    };
  } else {
    imageCutState = null;
  }
  syncStylePanel("select");
  draw();
}

function clearImageCut() {
  imageCutMode = null;
  imageCutState = null;
  imageCutDragState = null;
  board.classList.remove("cut-cursor");
  syncStylePanel(activeTool);
}

function applyImageCrop(item, rect) {
  const source = originalImageSource(item);
  const bounds = cropEditorBounds(item);
  const r = clampCropRect(rect, bounds);
  const nextW = r.w;
  const nextH = r.h;
  if (nextW < 14 || nextH < 14) return false;

  const nextCrop = {
    x: (r.x - bounds.x) / bounds.w,
    y: (r.y - bounds.y) / bounds.h,
    w: r.w / bounds.w,
    h: r.h / bounds.h,
  };
  const nextSx = source.sx + nextCrop.x * source.sw;
  const nextSy = source.sy + nextCrop.y * source.sh;
  const nextSw = nextCrop.w * source.sw;
  const nextSh = nextCrop.h * source.sh;
  const centerLocalX = r.x + r.w / 2;
  const centerLocalY = r.y + r.h / 2;
  const cos = Math.cos(item.rotation);
  const sin = Math.sin(item.rotation);

  item.x += centerLocalX * cos - centerLocalY * sin;
  item.y += centerLocalX * sin + centerLocalY * cos;
  item.sx = nextSx;
  item.sy = nextSy;
  item.sw = nextSw;
  item.sh = nextSh;
  item.w = nextW;
  item.h = nextH;
  item.crop = nextCrop;
  item.mask = undefined;
  return true;
}

function applyImageFreeCut(item, points) {
  if (points.length < 4) return false;
  const bounded = points.map((point) => ({
    x: clamp(point.x, -item.w / 2, item.w / 2),
    y: clamp(point.y, -item.h / 2, item.h / 2),
  }));
  const xs = bounded.map((point) => point.x);
  const ys = bounded.map((point) => point.y);
  const x1 = Math.min(...xs);
  const x2 = Math.max(...xs);
  const y1 = Math.min(...ys);
  const y2 = Math.max(...ys);
  const nextW = x2 - x1;
  const nextH = y2 - y1;
  if (nextW < 14 || nextH < 14) return false;

  const nx1 = (x1 + item.w / 2) / item.w;
  const nx2 = (x2 + item.w / 2) / item.w;
  const ny1 = (y1 + item.h / 2) / item.h;
  const ny2 = (y2 + item.h / 2) / item.h;
  const nextSx = item.sx + nx1 * item.sw;
  const nextSy = item.sy + ny1 * item.sh;
  const nextSw = (nx2 - nx1) * item.sw;
  const nextSh = (ny2 - ny1) * item.sh;
  const centerLocalX = (x1 + x2) / 2;
  const centerLocalY = (y1 + y2) / 2;
  const cos = Math.cos(item.rotation);
  const sin = Math.sin(item.rotation);

  item.x += centerLocalX * cos - centerLocalY * sin;
  item.y += centerLocalX * sin + centerLocalY * cos;
  item.sx = nextSx;
  item.sy = nextSy;
  item.sw = nextSw;
  item.sh = nextSh;
  item.w = nextW;
  item.h = nextH;
  item.mask = bounded.map((point) => ({
    x: (point.x - x1) / nextW,
    y: (point.y - y1) / nextH,
  }));
  item.outline = (item.strokeWidth ?? 0) > 0;
  return true;
}

function applyImageCut() {
  const selected = getSelected();
  if (!selected || selected.type !== "image" || !imageCutState || selected.id !== imageCutState.itemId) return false;
  if (imageCutState.rect) return applyImageCrop(selected, imageCutState.rect);
  if (imageCutState.points) return applyImageFreeCut(selected, imageCutState.points);
  return false;
}

function resetSelectedImage() {
  const selected = getSelected();
  if (!selected || selected.type !== "image" || !selected.original) return;
  selected.sx = selected.original.sx;
  selected.sy = selected.original.sy;
  selected.sw = selected.original.sw;
  selected.sh = selected.original.sh;
  selected.w = selected.original.w;
  selected.h = selected.original.h;
  selected.rotation = selected.original.rotation || 0;
  selected.crop = selected.original.crop ? { ...selected.original.crop } : { x: 0, y: 0, w: 1, h: 1 };
  selected.mask = selected.original.mask ? selected.original.mask.map((point) => ({ ...point })) : undefined;
  selected.outline = selected.original.outline;
  selected.strokeColor = selected.original.strokeColor || selected.strokeColor;
  selected.strokeWidth = selected.original.strokeWidth ?? selected.strokeWidth;
  clearImageCut();
  syncSelectedControls();
  draw();
  commitHistory();
}

function transformSelected(mutator) {
  const selected = getSelected();
  if (!selected) return;
  mutator(selected);
  draw();
  commitHistory();
}

function duplicateSelected() {
  const selected = getSelected();
  if (!selected) return;
  const clone = {
    ...selected,
    id: makeId("copy"),
    x: selected.x + 32,
    y: selected.y + 32,
    points: selected.points ? selected.points.map((point) => ({ x: point.x + 32, y: point.y + 32 })) : undefined,
    mask: selected.mask ? selected.mask.map((point) => ({ ...point })) : undefined,
    crop: selected.crop ? { ...selected.crop } : undefined,
    original: selected.original ? { ...selected.original } : undefined,
  };
  items.push(clone);
  selectedId = clone.id;
  draw();
  commitHistory();
}

function deleteSelectedItem() {
  if (!selectedId) return;
  items = items.filter((item) => item.id !== selectedId);
  selectedId = items.at(-1)?.id || null;
  syncSelectedControls();
  draw();
  commitHistory();
}

function toggleLayerVisibility(id) {
  const item = items.find((layer) => layer.id === id);
  if (!item) return;
  item.hidden = !item.hidden;
  if (item.hidden && selectedId === item.id) {
    selectedId = null;
    syncSelectedControls();
  }
  draw();
  commitHistory();
}

function renderLayers() {
  layerList.innerHTML = "";
  [...items].reverse().forEach((item, reverseIndex) => {
    const index = items.length - 1 - reverseIndex;
    const row = document.createElement("div");
    row.className = `layer-row${item.hidden ? " hidden-layer" : ""}${item.id === selectedId ? " active" : ""}`;
    const button = document.createElement("button");
    button.type = "button";
    button.draggable = true;
    button.setAttribute("draggable", "true");
    button.className = "layer-item";
    button.textContent = layerLabel(item);
    button.dataset.layerId = item.id;
    const visibility = document.createElement("button");
    visibility.type = "button";
    visibility.className = "layer-visibility";
    visibility.textContent = "";
    visibility.dataset.visible = String(!item.hidden);
    visibility.setAttribute("aria-label", item.hidden ? "Show layer" : "Hide layer");
    visibility.title = item.hidden ? "Show layer" : "Hide layer";
    visibility.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleLayerVisibility(item.id);
    });
    button.addEventListener("click", () => {
      if (item.hidden) return;
      setTool("select");
      selectedId = item.id;
      syncSelectedControls();
      draw();
    });
    button.addEventListener("dragstart", (event) => {
      draggedLayerId = item.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.id);
      row.classList.add("dragging");
    });
    button.addEventListener("dragend", () => {
      draggedLayerId = null;
      row.classList.remove("dragging");
      document.querySelectorAll(".layer-row.drop-target").forEach((layer) => {
        layer.classList.remove("drop-target");
      });
    });
    button.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (draggedLayerId && draggedLayerId !== item.id) {
        event.dataTransfer.dropEffect = "move";
        row.classList.add("drop-target");
      }
    });
    button.addEventListener("dragleave", () => {
      row.classList.remove("drop-target");
    });
    button.addEventListener("drop", (event) => {
      event.preventDefault();
      row.classList.remove("drop-target");
      reorderLayer(draggedLayerId || event.dataTransfer.getData("text/plain"), item.id);
    });
    button.dataset.index = index;
    row.append(button, visibility);
    layerList.appendChild(row);
  });
}

function reorderLayer(dragId, targetId) {
  if (!dragId || !targetId || dragId === targetId) return;
  const displayed = [...items].reverse();
  const draggedIndex = displayed.findIndex((item) => item.id === dragId);
  const targetIndex = displayed.findIndex((item) => item.id === targetId);
  if (draggedIndex < 0 || targetIndex < 0) return;
  const [dragged] = displayed.splice(draggedIndex, 1);
  const insertIndex = displayed.findIndex((item) => item.id === targetId);
  displayed.splice(insertIndex, 0, dragged);
  items = displayed.reverse();
  selectedId = dragId;
  draw();
  commitHistory();
}

function layerLabel(item) {
  if (item.type === "text") return item.text.slice(0, 28);
  if (item.type === "path") return "Brush stroke";
  if (item.type === "frame") return "Stroke frame";
  return item.mask ? "Free-cut label" : "Cropped label";
}

material.addEventListener("pointerdown", (event) => {
  if (!sourceReady) return;
  const point = materialPoint(event);
  if (activeTool === "freecut") {
    cutState = { points: [point] };
  } else {
    cutState = { start: point, rect: { x: point.x, y: point.y, w: 0, h: 0 } };
  }
  material.setPointerCapture(event.pointerId);
  drawMaterial();
});

material.addEventListener("pointermove", (event) => {
  if (!cutState) return;
  const point = materialPoint(event);
  if (cutState.points) {
    cutState.points.push(point);
  } else {
    cutState.rect = {
      x: cutState.start.x,
      y: cutState.start.y,
      w: point.x - cutState.start.x,
      h: point.y - cutState.start.y,
    };
  }
  drawMaterial();
});

material.addEventListener("pointerup", () => {
  if (!cutState) return;
  if (cutState.points) cutFree(cutState.points);
  else cutRectangle(cutState.rect);
  cutState = null;
  drawMaterial();
});

board.addEventListener("pointerdown", (event) => {
  const point = boardPoint(event);
  if (activeTool === "brush") {
    brushState = {
      id: makeId("path"),
      type: "path",
      points: [point],
      color: brushColor.value,
      size: Number(brushSize.value),
      brushStyle: activeBrushStyle,
    };
    items.push(brushState);
    selectedId = brushState.id;
    board.setPointerCapture(event.pointerId);
    draw();
    return;
  }
  if (activeTool === "frame") {
    frameState = {
      start: point,
      preview: {
        id: "preview-frame",
        type: "frame",
        x: point.x,
        y: point.y,
        w: 1,
        h: 1,
        rotation: 0,
        strokeColor: currentStrokeColor(),
        strokeWidth: currentStrokeWidth(),
        dashed: false,
      },
    };
    board.setPointerCapture(event.pointerId);
    draw();
    return;
  }
  if (imageCutMode) {
    const selected = getSelected();
    if (!selected || selected.type !== "image") {
      clearImageCut();
      draw();
      return;
    }
    const local = localPoint(selected, point);
    if (imageCutMode === "crop") {
      const hit = imageCutState?.rect ? cropHitAt(local, imageCutState.rect) : null;
      if (!hit) {
        draw();
        return;
      }
      imageCutDragState = {
        mode: hit,
        start: local,
        rect: normalizedRect(imageCutState.rect),
      };
    } else {
      if (!containsPoint(selected, point)) return;
      imageCutState = {
        itemId: selected.id,
        points: [local],
      };
    }
    board.setPointerCapture(event.pointerId);
    draw();
    return;
  }
  const handle = selectedHandleAt(point);
  if (handle) {
    const selected = getSelected();
    dragState = {
      mode: handle,
      start: point,
      startW: selected.w,
      startH: selected.h,
      startSize: selected.size || 0,
      startRotation: selected.rotation || 0,
      centerX: selected.x,
      centerY: selected.y,
      startDistance: Math.max(1, Math.hypot(point.x - selected.x, point.y - selected.y)),
      startAngle: Math.atan2(point.y - selected.y, point.x - selected.x),
    };
    board.setPointerCapture(event.pointerId);
    draw();
    return;
  }
  if (selectedOutlineAt(point)) {
    const selected = getSelected();
    dragState = { mode: "move", dx: point.x - selected.x, dy: point.y - selected.y };
    board.setPointerCapture(event.pointerId);
    draw();
    return;
  }
  const hit = [...items].reverse().find((item) => !item.hidden && containsPoint(item, point));
  if (!hit) {
    selectedId = null;
    syncSelectedControls();
    draw();
    return;
  }
  selectedId = hit.id;
  syncSelectedControls();
  if (hit.type === "path") {
    dragState = { dx: point.x, dy: point.y, path: true };
  } else {
    dragState = { mode: "move", dx: point.x - hit.x, dy: point.y - hit.y };
  }
  board.setPointerCapture(event.pointerId);
  draw();
});

board.addEventListener("pointermove", (event) => {
  const point = boardPoint(event);
  if (brushState) {
    brushState.points.push(point);
    draw();
    return;
  }
  if (frameState) {
    const x = Math.min(frameState.start.x, point.x);
    const y = Math.min(frameState.start.y, point.y);
    frameState.preview.x = x + Math.abs(point.x - frameState.start.x) / 2;
    frameState.preview.y = y + Math.abs(point.y - frameState.start.y) / 2;
    frameState.preview.w = Math.abs(point.x - frameState.start.x);
    frameState.preview.h = Math.abs(point.y - frameState.start.y);
    draw();
    return;
  }
  if (imageCutState) {
    const selected = getSelected();
    if (!selected || selected.id !== imageCutState.itemId) {
      clearImageCut();
      draw();
      return;
    }
    if (imageCutMode === "crop" && !imageCutDragState) return;
    const local = localPoint(selected, point);
    if (imageCutMode === "crop" && imageCutDragState && imageCutState.rect) {
      const dx = local.x - imageCutDragState.start.x;
      const dy = local.y - imageCutDragState.start.y;
      const r = { ...imageCutDragState.rect };
      if (imageCutDragState.mode === "move") {
        r.x += dx;
        r.y += dy;
      } else {
        if (imageCutDragState.mode.includes("w")) {
          r.x += dx;
          r.w -= dx;
        }
        if (imageCutDragState.mode.includes("e")) r.w += dx;
        if (imageCutDragState.mode.includes("n")) {
          r.y += dy;
          r.h -= dy;
        }
        if (imageCutDragState.mode.includes("s")) r.h += dy;
      }
      imageCutState.rect = clampCropRect(r, cropEditorBounds(selected));
    } else {
      imageCutState.points.push(local);
    }
    draw();
    return;
  }
  if (!dragState || !selectedId) return;
  const selected = getSelected();
  if (dragState.mode === "scale") {
    const distance = Math.max(1, Math.hypot(point.x - dragState.centerX, point.y - dragState.centerY));
    const factor = Math.max(0.12, distance / dragState.startDistance);
    selected.w = Math.max(24, dragState.startW * factor);
    selected.h = Math.max(18, dragState.startH * factor);
    if (selected.type === "text") selected.size = Math.max(8, dragState.startSize * factor);
    draw();
    return;
  }
  if (dragState.mode === "rotate") {
    const angle = Math.atan2(point.y - dragState.centerY, point.x - dragState.centerX);
    selected.rotation = dragState.startRotation + angle - dragState.startAngle;
    draw();
    return;
  }
  if (dragState.path) {
    const dx = point.x - dragState.dx;
    const dy = point.y - dragState.dy;
    selected.points.forEach((p) => {
      p.x += dx;
      p.y += dy;
    });
    dragState.dx = point.x;
    dragState.dy = point.y;
  } else {
    selected.x = point.x - dragState.dx;
    selected.y = point.y - dragState.dy;
  }
  draw();
});

board.addEventListener("pointerup", () => {
  if (imageCutMode === "crop" && imageCutState) {
    imageCutDragState = null;
    draw();
    return;
  }
  if (imageCutState) {
    const didCut = applyImageCut();
    clearImageCut();
    draw();
    if (didCut) commitHistory();
    return;
  }
  const shouldCommit = !!brushState || !!dragState || (frameState?.preview && frameState.preview.w > 12 && frameState.preview.h > 12);
  if (frameState?.preview && frameState.preview.w > 12 && frameState.preview.h > 12) {
    frameState.preview.id = makeId("frame");
    items.push(frameState.preview);
    selectedId = frameState.preview.id;
  }
  brushState = null;
  frameState = null;
  dragState = null;
  draw();
  if (shouldCommit) commitHistory();
});

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

brushStyleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeBrushStyle = button.dataset.brushStyle;
    brushStyleButtons.forEach((option) => {
      option.classList.toggle("active", option === button);
      option.setAttribute("aria-checked", String(option === button));
    });
  });
});

libraryTabs.forEach((button) => {
  button.addEventListener("click", () => {
    activeMaterialTab = button.dataset.libraryTab;
    renderMaterialLibrary();
  });
});

librarySearch?.addEventListener("input", () => {
  libraryQuery = librarySearch.value;
  renderMaterialLibrary();
});

if (openLibrary) openLibrary.onclick = openLibraryModal;
if (closeLibrary) closeLibrary.onclick = closeLibraryModal;

libraryModal?.addEventListener("click", (event) => {
  if (event.target === libraryModal) closeLibraryModal();
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isEditableTarget = target?.matches?.("input, textarea, select, [contenteditable='true']");
  const commandKey = event.metaKey || event.ctrlKey;
  if (event.key === "Escape" && libraryModal && !libraryModal.hidden) {
    closeLibraryModal();
    return;
  }
  if (event.key === "Escape" && imageCutMode) {
    clearImageCut();
    draw();
    return;
  }
  if (event.key === "Enter" && imageCutMode === "crop" && imageCutState) {
    const didCut = applyImageCut();
    clearImageCut();
    draw();
    if (didCut) commitHistory();
    return;
  }
  if (!isEditableTarget && commandKey && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) redoHistory();
    else undoHistory();
    return;
  }
  if (!isEditableTarget && commandKey && event.key.toLowerCase() === "y") {
    event.preventDefault();
    redoHistory();
    return;
  }
  if (!isEditableTarget && (event.key === "Delete" || event.key === "Backspace") && selectedId) {
    event.preventDefault();
    deleteSelectedItem();
  }
});

document.querySelector("#addText").addEventListener("click", () => {
  const value = phraseInput.value.trim();
  if (!value) return;
  const item = makeTextItem({
    text: value,
    color: textColor?.value || "#111111",
    fill: isNoFillActive() ? "transparent" : textFillColor?.value || "#fffefa",
    strokeColor: currentSelectedStrokeColor(),
    strokeWidth: currentSelectedStrokeWidth(),
  });
  items.push(item);
  selectedId = item.id;
  setTool("select");
  syncSelectedControls();
  draw();
  commitHistory();
});

function updateSelectedTextStyle(shouldCommit = true) {
  const selected = getSelected();
  if (!selected || selected.type !== "text") return;
  selected.text = phraseInput.value || selected.text;
  selected.color = textColor?.value || selected.color;
  selected.fill = isNoFillActive() ? "transparent" : textFillColor?.value || selected.fill;
  selected.strokeColor = currentSelectedStrokeColor();
  selected.strokeWidth = currentSelectedStrokeWidth();
  selected.outline = selected.strokeWidth > 0;
  ctx.save();
  ctx.font = `${selected.weight} ${selected.size}px Helvetica Neue, Arial, sans-serif`;
  selected.w = Math.max(ctx.measureText(selected.text).width + 28, 86);
  ctx.restore();
  draw();
  if (shouldCommit) commitHistory();
}

phraseInput?.addEventListener("input", () => updateSelectedTextStyle(false));
phraseInput?.addEventListener("change", () => updateSelectedTextStyle());
document.querySelectorAll('input[type="range"]').forEach((input) => {
  syncRangeProgress(input);
  input.addEventListener("input", () => syncRangeProgress(input));
  input.addEventListener("change", () => syncRangeProgress(input));
});
textColor?.addEventListener("input", () => updateSelectedTextStyle(false));
textColor?.addEventListener("change", () => updateSelectedTextStyle());
textFillColor?.addEventListener("input", () => {
  setNoFillActive(false);
  updateSelectedTextStyle(false);
});
textFillColor?.addEventListener("change", () => updateSelectedTextStyle());
noFillSelected?.addEventListener("click", () => {
  setNoFillActive(!isNoFillActive());
  updateSelectedTextStyle();
});
selectedStrokeColor?.addEventListener("input", () => {
  setNoStrokeActive(false);
  if (selectedStrokeSize && Number(selectedStrokeSize.value) <= 0) selectedStrokeSize.value = "2";
  syncRangeProgress(selectedStrokeSize);
  transformSelected((item) => {
    if (item.type === "path") item.color = currentSelectedStrokeColor();
    else {
      item.strokeColor = currentSelectedStrokeColor();
      item.outline = true;
    }
  });
});
selectedStrokeSize?.addEventListener("input", () => {
  setNoStrokeActive(Number(selectedStrokeSize.value) <= 0);
  transformSelected((item) => {
    if (item.type === "path") item.size = currentSelectedStrokeWidth();
    else {
      item.strokeWidth = currentSelectedStrokeWidth();
      item.outline = item.strokeWidth > 0;
    }
  });
});
noStrokeSelected?.addEventListener("click", () => {
  const next = !isNoStrokeActive();
  setNoStrokeActive(next);
  if (selectedStrokeSize) selectedStrokeSize.value = next ? "0" : "2";
  syncRangeProgress(selectedStrokeSize);
  transformSelected((item) => {
    if (item.type === "path") item.size = next ? 0 : 2;
    else {
      item.strokeWidth = next ? 0 : 2;
      item.outline = !next;
    }
  });
});
selectedOpacity?.addEventListener("input", () => {
  transformSelected((item) => {
    item.opacity = Number(selectedOpacity.value) / 100;
  });
});

if (libraryUpload) {
  libraryUpload.addEventListener("change", (event) => {
    Array.from(event.target.files || []).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        placeMaterialAsset({
          name: file.name.replace(/\.[^.]+$/, ""),
          file: file.name,
          src: reader.result,
        });
      };
      reader.readAsDataURL(file);
    });
    libraryUpload.value = "";
  });
}

if (imageUpload) {
  imageUpload.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadSource(reader.result);
    reader.readAsDataURL(file);
  });
}

document.querySelector("#placeSource")?.addEventListener("click", () => {
  if (!sourceReady) return;
  const itemW = 480;
  items.push(storeOriginalImageState({
    id: makeId("sheet"),
    type: "image",
    img: sourceImage,
    sx: 0,
    sy: 0,
    sw: sourceImage.naturalWidth,
    sh: sourceImage.naturalHeight,
    x: 560,
    y: 680,
    w: itemW,
    h: itemW * (sourceImage.naturalHeight / sourceImage.naturalWidth),
    rotation: 0,
    outline: true,
    strokeColor: currentStrokeColor(),
    strokeWidth: currentStrokeWidth(),
  }));
  selectedId = items.at(-1).id;
  draw();
  commitHistory();
});

document.querySelector("#rotateLeft").addEventListener("click", () => transformSelected((item) => {
  if (item.type !== "path") item.rotation -= Math.PI / 12;
}));

document.querySelector("#rotateRight").addEventListener("click", () => transformSelected((item) => {
  if (item.type !== "path") item.rotation += Math.PI / 12;
}));

document.querySelector("#scaleDown").addEventListener("click", () => transformSelected((item) => {
  if (item.type === "path") {
    item.size = Math.max(1, item.size * 0.9);
    return;
  }
  item.w *= 0.9;
  item.h *= 0.9;
  if (item.type === "text") item.size = Math.max(10, item.size * 0.92);
}));

document.querySelector("#scaleUp").addEventListener("click", () => transformSelected((item) => {
  if (item.type === "path") {
    item.size *= 1.1;
    return;
  }
  item.w *= 1.1;
  item.h *= 1.1;
  if (item.type === "text") item.size *= 1.08;
}));

cropImage?.addEventListener("click", () => startImageCut("crop"));
freeCutImage?.addEventListener("click", () => startImageCut("free"));
resetImage?.addEventListener("click", resetSelectedImage);
applyCropImage?.addEventListener("click", () => {
  if (imageCutMode !== "crop" || !imageCutState) return;
  const didCut = applyImageCut();
  clearImageCut();
  draw();
  if (didCut) commitHistory();
});
cancelCropImage?.addEventListener("click", () => {
  clearImageCut();
  draw();
});

document.querySelector("#duplicateItem").addEventListener("click", duplicateSelected);

document.querySelector("#deleteItem").addEventListener("click", deleteSelectedItem);

document.querySelector("#bringForward")?.addEventListener("click", () => {
  const index = items.findIndex((item) => item.id === selectedId);
  if (index < 0 || index >= items.length - 1) return;
  [items[index], items[index + 1]] = [items[index + 1], items[index]];
  draw();
  commitHistory();
});

document.querySelector("#sendBackward")?.addEventListener("click", () => {
  const index = items.findIndex((item) => item.id === selectedId);
  if (index <= 0) return;
  [items[index], items[index - 1]] = [items[index - 1], items[index]];
  draw();
  commitHistory();
});

snapshotState?.addEventListener("click", () => {
  commitHistory();
});

undoAction?.addEventListener("click", undoHistory);
redoAction?.addEventListener("click", redoHistory);

document.querySelector("#exportPng").addEventListener("click", () => {
  const previous = selectedId;
  selectedId = null;
  draw();
  const link = document.createElement("a");
  link.download = "plastic-anxiety-collage.png";
  link.href = board.toDataURL("image/png");
  link.click();
  selectedId = previous;
  draw();
});

function seedCanvas() {
  createNoise();
  items = seedFragments.map(makeTextItem);
  selectedId = items[0]?.id || null;
  loadSource("assets/workshop-collage.jpg");
  loadMaterialLibrary();
  setTool("select");
  draw();
  commitHistory();
}

document.querySelectorAll(".panel-toggle").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const panel = toggle.closest(".panel");
    if (panel) panel.classList.toggle("expanded");
  });
});

const panelTabs = document.querySelectorAll(".panel-tab");
const materialPanelEl = document.querySelector(".material-panel");
const stylePanelEl = document.querySelector(".style-panel");
const layerListEl = document.querySelector("#layerList");
if (panelTabs.length && materialPanelEl && stylePanelEl) {
  panelTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      panelTabs.forEach((t) => t.classList.toggle("active", t === tab));
      materialPanelEl.classList.toggle("active-tab", target === "material" || target === "layers");
      stylePanelEl.classList.toggle("active-tab", target === "style");
      materialPanelEl.dataset.tabMode = target === "layers" ? "layers" : "material";
      if (target === "layers" && layerListEl) {
        layerListEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

seedCanvas();
