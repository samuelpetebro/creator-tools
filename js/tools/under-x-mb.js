const compressInput = document.querySelector('#compressFileInput');
const compressDropZone = document.querySelector('#compressDropZone');
const compressFileInfo = document.querySelector('#compressFileInfo');
const targetSizeInput = document.querySelector('#targetSize');
const targetUnitSelect = document.querySelector('#targetUnit');
const compressButton = document.querySelector('#compressButton');
const compressStatus = document.querySelector('#compressStatus');
const compressResult = document.querySelector('#compressResult');
const originalSizeEl = document.querySelector('#originalSize');
const compressedSizeEl = document.querySelector('#compressedSize');
const compressedQualityEl = document.querySelector('#compressedQuality');
const compressedDimensionsEl = document.querySelector('#compressedDimensions');
const compressedPreview = document.querySelector('#compressedPreview');
const compressDownloadButton = document.querySelector('#compressDownloadButton');

let compressFile = null;
let compressedBlob = null;
let compressedObjectUrl = null;

function prettyBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function targetBytes() {
  const value = Number(targetSizeInput.value);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return targetUnitSelect.value === 'KB' ? value * 1024 : value * 1024 * 1024;
}

function setCompressFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert('Please choose an image file.');
    return;
  }

  compressFile = file;
  compressedBlob = null;
  compressButton.disabled = false;
  compressResult.hidden = true;
  compressStatus.hidden = true;
  compressFileInfo.hidden = false;
  compressFileInfo.textContent = `${file.name} · ${prettyBytes(file.size)}`;
}

compressInput.addEventListener('change', (event) => setCompressFile(event.target.files[0]));

['dragenter', 'dragover'].forEach((type) => {
  compressDropZone.addEventListener(type, (event) => {
    event.preventDefault();
    compressDropZone.classList.add('dragging');
  });
});

['dragleave', 'drop'].forEach((type) => {
  compressDropZone.addEventListener(type, (event) => {
    event.preventDefault();
    compressDropZone.classList.remove('dragging');
  });
});

compressDropZone.addEventListener('drop', (event) => setCompressFile(event.dataTransfer.files[0]));

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

async function loadImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function bestQualityUnderTarget(canvas, maxBytes) {
  const minimumQuality = 0.08;
  const maximumQuality = 0.95;

  let low = minimumQuality;
  let high = maximumQuality;
  let bestBlob = null;
  let bestQuality = minimumQuality;

  const minimumBlob = await canvasToBlob(canvas, minimumQuality);
  if (!minimumBlob || minimumBlob.size > maxBytes) {
    return null;
  }

  for (let i = 0; i < 10; i += 1) {
    const quality = (low + high) / 2;
    const blob = await canvasToBlob(canvas, quality);
    if (!blob) break;

    if (blob.size <= maxBytes) {
      bestBlob = blob;
      bestQuality = quality;
      low = quality;
    } else {
      high = quality;
    }
  }

  return { blob: bestBlob || minimumBlob, quality: bestBlob ? bestQuality : minimumQuality };
}

async function compressWithResizeFallback(image, maxBytes) {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  for (let resizeStep = 0; resizeStep < 7; resizeStep += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));

    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const result = await bestQualityUnderTarget(canvas, maxBytes);
    if (result) {
      return {
        ...result,
        width: canvas.width,
        height: canvas.height,
        resized: resizeStep > 0,
      };
    }

    width *= 0.82;
    height *= 0.82;
  }

  return null;
}

compressButton.addEventListener('click', async () => {
  if (!compressFile) return;

  const maxBytes = targetBytes();
  if (!maxBytes) {
    alert('Enter a valid target size.');
    return;
  }

  compressButton.disabled = true;
  compressButton.textContent = 'Finding best quality…';
  compressStatus.hidden = false;
  compressStatus.textContent = 'Testing image quality locally on your device…';
  compressResult.hidden = true;

  try {
    const image = await loadImage(compressFile);
    const result = await compressWithResizeFallback(image, maxBytes);

    if (!result) {
      throw new Error('Could not reach that target size without making the image extremely small.');
    }

    compressedBlob = result.blob;

    if (compressedObjectUrl) URL.revokeObjectURL(compressedObjectUrl);
    compressedObjectUrl = URL.createObjectURL(compressedBlob);
    compressedPreview.src = compressedObjectUrl;

    originalSizeEl.textContent = prettyBytes(compressFile.size);
    compressedSizeEl.textContent = prettyBytes(compressedBlob.size);
    compressedQualityEl.textContent = `${Math.round(result.quality * 100)}%`;
    compressedDimensionsEl.textContent = `${result.width} × ${result.height}${result.resized ? ' · resized' : ''}`;

    const savings = Math.max(0, 100 - (compressedBlob.size / compressFile.size) * 100);
    compressStatus.textContent = `Done — ${savings.toFixed(0)}% smaller and under your target.`;
    compressResult.hidden = false;
    compressResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    compressStatus.textContent = error.message || 'Something went wrong while compressing the image.';
  } finally {
    compressButton.disabled = false;
    compressButton.textContent = 'Compress to target';
  }
});

compressDownloadButton.addEventListener('click', () => {
  if (!compressedBlob) return;

  const link = document.createElement('a');
  const url = URL.createObjectURL(compressedBlob);
  const baseName = compressFile.name.replace(/\.[^.]+$/, '') || 'image';

  link.href = url;
  link.download = `${baseName}-under-${targetSizeInput.value}${targetUnitSelect.value.toLowerCase()}.jpg`;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
