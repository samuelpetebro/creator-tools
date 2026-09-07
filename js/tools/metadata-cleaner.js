(() => {
  'use strict';

  const input = document.getElementById('metadataFileInput');
  const drop = document.getElementById('metadataDropZone');
  const info = document.getElementById('metadataFileInfo');
  const cleanButton = document.getElementById('metadataCleanButton');
  const result = document.getElementById('metadataResult');
  const originalSize = document.getElementById('metadataOriginalSize');
  const cleanedSize = document.getElementById('metadataCleanedSize');
  const dimensions = document.getElementById('metadataDimensions');
  const format = document.getElementById('metadataFormat');
  const preview = document.getElementById('metadataPreview');
  const downloadButton = document.getElementById('metadataDownloadButton');

  let file = null;
  let cleanedBlob = null;
  let previewUrl = null;
  let outputExtension = 'jpg';

  function prettyBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  function setFile(next) {
    if (!next || !next.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }
    file = next;
    cleanedBlob = null;
    info.hidden = false;
    info.textContent = `${next.name} · ${prettyBytes(next.size)}`;
    cleanButton.disabled = false;
    result.hidden = true;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(source);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('decode'));
      };
      image.src = url;
    });
  }

  function outputTypeFor(source) {
    if (source.type === 'image/png') return { mime: 'image/png', ext: 'png', label: 'PNG' };
    if (source.type === 'image/webp') return { mime: 'image/webp', ext: 'webp', label: 'WebP' };
    return { mime: 'image/jpeg', ext: 'jpg', label: 'JPEG' };
  }

  function canvasToBlob(canvas, mime) {
    return new Promise(resolve => {
      const quality = mime === 'image/jpeg' || mime === 'image/webp' ? 0.95 : undefined;
      canvas.toBlob(resolve, mime, quality);
    });
  }

  input.addEventListener('change', event => setFile(event.target.files[0]));
  ['dragenter', 'dragover'].forEach(type => drop.addEventListener(type, event => {
    event.preventDefault();
    drop.classList.add('dragging');
  }));
  ['dragleave', 'drop'].forEach(type => drop.addEventListener(type, event => {
    event.preventDefault();
    drop.classList.remove('dragging');
  }));
  drop.addEventListener('drop', event => setFile(event.dataTransfer.files[0]));

  cleanButton.addEventListener('click', async () => {
    if (!file) return;
    cleanButton.disabled = true;
    cleanButton.textContent = 'Cleaning metadata…';

    try {
      const image = await loadImage(file);
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      const output = outputTypeFor(file);

      if (output.mime === 'image/jpeg') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(image, 0, 0);

      cleanedBlob = await canvasToBlob(canvas, output.mime);
      if (!cleanedBlob) throw new Error('export');

      outputExtension = output.ext;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(cleanedBlob);
      preview.src = previewUrl;

      originalSize.textContent = prettyBytes(file.size);
      cleanedSize.textContent = prettyBytes(cleanedBlob.size);
      dimensions.textContent = `${canvas.width} × ${canvas.height}`;
      format.textContent = output.label;
      result.hidden = false;
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (_) {
      alert('Could not clean this image. Try JPG, PNG or WebP.');
    } finally {
      cleanButton.disabled = false;
      cleanButton.textContent = 'Remove metadata';
    }
  });

  downloadButton.addEventListener('click', () => {
    if (!cleanedBlob || !file) return;
    const base = file.name.replace(/\.[^.]+$/, '') || 'image';
    const url = URL.createObjectURL(cleanedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${base}-clean.${outputExtension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  });
})();