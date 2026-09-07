(() => {
  'use strict';

  if (!document.querySelector('link[data-aero-v2]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = 'css/aero-v2.css?v=1';
    style.dataset.aeroV2 = 'true';
    document.head.appendChild(style);
  }

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
  const canvas = document.getElementById('previewCanvas');
  const ctx = canvas.getContext('2d');
  const downloadBtn = document.getElementById('downloadButton');
  const resultPreset = document.getElementById('resultPreset');
  const resultDimensions = document.getElementById('resultDimensions');

  let currentFile = null;

  function setFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }

    currentFile = file;
    info.hidden = false;
    info.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB · ready`;
    processBtn.disabled = false;
    result.hidden = true;
  }

  function loadSelectedImage() {
    return new Promise((resolve, reject) => {
      const file = (input.files && input.files[0]) || currentFile;
      if (!file) {
        reject(new Error('NO_FILE'));
        return;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('DECODE_FAILED'));
      };
      img.src = url;
    });
  }

  async function exportImage() {
    try {
      const img = await loadSelectedImage();
      const preset = presets[select.value];
      const sourceRatio = img.naturalWidth / img.naturalHeight;
      const targetRatio = preset.width / preset.height;

      let sx = 0;
      let sy = 0;
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;

      if (sourceRatio > targetRatio) {
        sw = img.naturalHeight * targetRatio;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        sh = img.naturalWidth / targetRatio;
        sy = (img.naturalHeight - sh) / 2;
      }

      canvas.width = preset.width;
      canvas.height = preset.height;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, preset.width, preset.height);

      resultPreset.textContent = preset.name;
      resultDimensions.textContent = `${preset.width} × ${preset.height} JPG`;
      result.hidden = false;
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return true;
    } catch (error) {
      if (error.message === 'NO_FILE') alert('Upload an image first.');
      else alert('This image could not be read. Try JPG, PNG or WebP.');
      return false;
    }
  }

  input.addEventListener('change', event => setFile(event.target.files[0]));

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
    const file = event.dataTransfer && event.dataTransfer.files[0];
    setFile(file);
  });

  processBtn.addEventListener('click', exportImage);

  downloadBtn.addEventListener('click', async () => {
    if (result.hidden) {
      const ok = await exportImage();
      if (!ok) return;
    }

    const preset = presets[select.value];
    canvas.toBlob(blob => {
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
})();
