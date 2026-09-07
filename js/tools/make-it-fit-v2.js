(() => {
  'use strict';

  const presets = {
    youtube: { name: 'YouTube Thumbnail', width: 1280, height: 720 },
    'instagram-post': { name: 'Instagram Post', width: 1080, height: 1080 },
    'instagram-story': { name: 'Instagram Story', width: 1080, height: 1920 },
    spotify: { name: 'Spotify Cover', width: 3000, height: 3000 },
    'discord-avatar': { name: 'Discord Avatar', width: 512, height: 512 }
  };

  const input = document.getElementById('fileInput');
  const drop = document.getElementById('dropZone');
  const info = document.getElementById('fileInfo');
  const select = document.getElementById('presetSelect');
  const processBtn = document.getElementById('processButton');
  const result = document.getElementById('result');
  const exportCanvas = document.getElementById('previewCanvas');
  const exportCtx = exportCanvas.getContext('2d');
  const downloadBtn = document.getElementById('downloadButton');
  const cropEditor = document.getElementById('cropEditor');
  const cropStage = document.getElementById('cropStage');
  const cropCanvas = document.getElementById('cropPreviewCanvas');
  const cropCtx = cropCanvas.getContext('2d');
  const resetCropButton = document.getElementById('resetCropButton');

  let selectedFile = null;
  let decodedImage = null;
  let focusX = 0.5;
  let focusY = 0.5;
  let dragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let loadToken = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function decodeFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not decode image'));
      };

      image.src = url;
    });
  }

  function getCropRect(image, preset) {
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    const sourceRatio = imageWidth / imageHeight;
    const targetRatio = preset.width / preset.height;

    let sw = imageWidth;
    let sh = imageHeight;

    if (sourceRatio > targetRatio) {
      sw = imageHeight * targetRatio;
    } else {
      sh = imageWidth / targetRatio;
    }

    const maxX = Math.max(0, imageWidth - sw);
    const maxY = Math.max(0, imageHeight - sh);

    return {
      sx: maxX * focusX,
      sy: maxY * focusY,
      sw,
      sh,
      maxX,
      maxY
    };
  }

  function renderCropPreview() {
    if (!decodedImage) return;

    const preset = presets[select.value];
    const ratio = preset.width / preset.height;
    const availableWidth = Math.max(240, cropStage.clientWidth || 700);
    const maxWidth = Math.min(760, availableWidth);
    const maxHeight = 440;

    let cssWidth = maxWidth;
    let cssHeight = cssWidth / ratio;

    if (cssHeight > maxHeight) {
      cssHeight = maxHeight;
      cssWidth = cssHeight * ratio;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cropCanvas.width = Math.max(1, Math.round(cssWidth * dpr));
    cropCanvas.height = Math.max(1, Math.round(cssHeight * dpr));
    cropCanvas.style.width = `${Math.round(cssWidth)}px`;
    cropCanvas.style.height = `${Math.round(cssHeight)}px`;

    const crop = getCropRect(decodedImage, preset);

    cropCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cropCtx.clearRect(0, 0, cssWidth, cssHeight);
    cropCtx.drawImage(
      decodedImage,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      cssWidth,
      cssHeight
    );
  }

  async function selectFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }

    const token = ++loadToken;
    selectedFile = file;
    decodedImage = null;
    focusX = 0.5;
    focusY = 0.5;
    result.hidden = true;
    cropEditor.hidden = true;
    processBtn.disabled = true;
    processBtn.textContent = 'Loading image…';

    info.hidden = false;
    info.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB · loading…`;

    try {
      const image = await decodeFile(file);
      if (token !== loadToken) return;

      decodedImage = image;
      cropEditor.hidden = false;
      processBtn.disabled = false;
      processBtn.textContent = 'Export this crop';
      info.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB · ready`;
      requestAnimationFrame(renderCropPreview);
    } catch (error) {
      if (token !== loadToken) return;
      decodedImage = null;
      processBtn.disabled = false;
      processBtn.textContent = 'Export this crop';
      info.textContent = `${file.name} · could not load`;
      alert('This image could not be read. Try JPG, PNG or WebP.');
    }
  }

  async function ensureImageReady() {
    if (decodedImage) return decodedImage;

    const file = input.files && input.files[0] ? input.files[0] : selectedFile;
    if (!file) return null;

    try {
      const image = await decodeFile(file);
      selectedFile = file;
      decodedImage = image;
      cropEditor.hidden = false;
      info.hidden = false;
      info.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB · ready`;
      requestAnimationFrame(renderCropPreview);
      return image;
    } catch (error) {
      return null;
    }
  }

  async function buildExport() {
    const image = await ensureImageReady();

    if (!image) {
      alert('Upload an image first.');
      return false;
    }

    const preset = presets[select.value];
    const crop = getCropRect(image, preset);

    exportCanvas.width = preset.width;
    exportCanvas.height = preset.height;
    exportCtx.fillStyle = '#fff';
    exportCtx.fillRect(0, 0, preset.width, preset.height);
    exportCtx.drawImage(
      image,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      preset.width,
      preset.height
    );

    document.getElementById('resultPreset').textContent = preset.name;
    document.getElementById('resultDimensions').textContent = `${preset.width} × ${preset.height} JPG`;
    result.hidden = false;
    return true;
  }

  input.addEventListener('change', event => {
    selectFile(event.target.files && event.target.files[0]);
  });

  ['dragenter', 'dragover'].forEach(type => {
    drop.addEventListener(type, event => {
      event.preventDefault();
      drop.classList.add('dragging');
    });
  });

  ['dragleave', 'drop'].forEach(type => {
    drop.addEventListener(type, event => {
      event.preventDefault();
      drop.classList.remove('dragging');
    });
  });

  drop.addEventListener('drop', event => {
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    selectFile(file);
  });

  select.addEventListener('change', () => {
    focusX = 0.5;
    focusY = 0.5;
    result.hidden = true;
    renderCropPreview();
  });

  resetCropButton.addEventListener('click', () => {
    focusX = 0.5;
    focusY = 0.5;
    renderCropPreview();
  });

  cropStage.addEventListener('pointerdown', event => {
    if (!decodedImage) return;
    dragging = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    cropStage.classList.add('is-dragging');
    try { cropStage.setPointerCapture(event.pointerId); } catch (_) {}
  });

  cropStage.addEventListener('pointermove', event => {
    if (!dragging || !decodedImage) return;

    const crop = getCropRect(decodedImage, presets[select.value]);
    const rect = cropCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dx = event.clientX - lastPointerX;
    const dy = event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;

    if (crop.maxX > 0) {
      focusX = clamp(focusX - (dx * (crop.sw / rect.width)) / crop.maxX, 0, 1);
    }

    if (crop.maxY > 0) {
      focusY = clamp(focusY - (dy * (crop.sh / rect.height)) / crop.maxY, 0, 1);
    }

    renderCropPreview();
  });

  function stopDragging() {
    dragging = false;
    cropStage.classList.remove('is-dragging');
  }

  cropStage.addEventListener('pointerup', stopDragging);
  cropStage.addEventListener('pointercancel', stopDragging);
  cropStage.addEventListener('pointerleave', event => {
    if (event.buttons === 0) stopDragging();
  });

  processBtn.addEventListener('click', async () => {
    processBtn.disabled = true;
    processBtn.textContent = 'Exporting…';

    const ok = await buildExport();

    processBtn.disabled = false;
    processBtn.textContent = 'Export this crop';

    if (ok) {
      requestAnimationFrame(() => result.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    }
  });

  downloadBtn.addEventListener('click', async () => {
    const ok = await buildExport();
    if (!ok) return;

    const preset = presets[select.value];
    exportCanvas.toBlob(blob => {
      if (!blob) {
        alert('Could not export this image.');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `creatortools-${select.value}-${preset.width}x${preset.height}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, 'image/jpeg', 0.92);
  });

  window.addEventListener('resize', () => {
    if (decodedImage) renderCropPreview();
  });
})();
