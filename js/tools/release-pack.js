(() => {
  'use strict';

  const packs = {
    music: {
      name: 'Music Release',
      outputs: [
        { name: 'Square Cover', file: 'square-cover-3000x3000.jpg', width: 3000, height: 3000 },
        { name: 'Social Post', file: 'social-post-1080x1080.jpg', width: 1080, height: 1080 },
        { name: 'Story / Reel', file: 'story-1080x1920.jpg', width: 1080, height: 1920 },
        { name: 'YouTube Thumbnail', file: 'youtube-thumbnail-1280x720.jpg', width: 1280, height: 720 }
      ]
    },
    youtube: {
      name: 'YouTube Launch',
      outputs: [
        { name: 'Thumbnail', file: 'youtube-thumbnail-1280x720.jpg', width: 1280, height: 720 },
        { name: 'Square Promo', file: 'square-promo-1080x1080.jpg', width: 1080, height: 1080 },
        { name: 'Story / Short', file: 'vertical-promo-1080x1920.jpg', width: 1080, height: 1920 }
      ]
    },
    social: {
      name: 'Social Pack',
      outputs: [
        { name: 'Square Post', file: 'square-post-1080x1080.jpg', width: 1080, height: 1080 },
        { name: 'Portrait Post', file: 'portrait-post-1080x1350.jpg', width: 1080, height: 1350 },
        { name: 'Story / Reel', file: 'story-1080x1920.jpg', width: 1080, height: 1920 }
      ]
    },
    profile: {
      name: 'Profile Pack',
      outputs: [
        { name: 'Large Avatar', file: 'avatar-1024x1024.jpg', width: 1024, height: 1024 },
        { name: 'Medium Avatar', file: 'avatar-512x512.jpg', width: 512, height: 512 },
        { name: 'Small Avatar', file: 'avatar-256x256.jpg', width: 256, height: 256 }
      ]
    }
  };

  const input = document.getElementById('packFileInput');
  const drop = document.getElementById('packDropZone');
  const info = document.getElementById('packFileInfo');
  const select = document.getElementById('packSelect');
  const generate = document.getElementById('packGenerateButton');
  const result = document.getElementById('packResult');
  const grid = document.getElementById('packResultGrid');
  const downloadAll = document.getElementById('packDownloadAll');
  let file = null;
  let generated = [];

  function setFile(next) {
    if (!next || !next.type.startsWith('image/')) return alert('Please choose an image file.');
    file = next;
    info.hidden = false;
    info.textContent = `${next.name} · ${(next.size / 1024 / 1024).toFixed(2)} MB`;
    generate.disabled = false;
    result.hidden = true;
    clearGenerated();
  }

  function clearGenerated() {
    generated.forEach(item => URL.revokeObjectURL(item.url));
    generated = [];
    grid.innerHTML = '';
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(source);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  function renderBlob(img, output) {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      canvas.width = output.width;
      canvas.height = output.height;
      const ctx = canvas.getContext('2d');
      const sourceRatio = img.naturalWidth / img.naturalHeight;
      const targetRatio = output.width / output.height;
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (sourceRatio > targetRatio) {
        sw = img.naturalHeight * targetRatio;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        sh = img.naturalWidth / targetRatio;
        sy = (img.naturalHeight - sh) / 2;
      }
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, output.width, output.height);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, output.width, output.height);
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.92);
    });
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  input.addEventListener('change', e => setFile(e.target.files[0]));
  ['dragenter','dragover'].forEach(type => drop.addEventListener(type, e => { e.preventDefault(); drop.classList.add('dragging'); }));
  ['dragleave','drop'].forEach(type => drop.addEventListener(type, e => { e.preventDefault(); drop.classList.remove('dragging'); }));
  drop.addEventListener('drop', e => setFile(e.dataTransfer.files[0]));
  select.addEventListener('change', () => { result.hidden = true; clearGenerated(); });

  generate.addEventListener('click', async () => {
    if (!file) return;
    generate.disabled = true;
    generate.textContent = 'Generating pack…';
    clearGenerated();
    try {
      const img = await loadImage(file);
      const pack = packs[select.value];
      for (const output of pack.outputs) {
        const blob = await renderBlob(img, output);
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        generated.push({ ...output, blob, url });
        const card = document.createElement('article');
        card.className = 'pack-output-card';
        card.innerHTML = `<img src="${url}" alt="${output.name} preview"><div><strong>${output.name}</strong><span>${output.width} × ${output.height} · ${(blob.size/1024).toFixed(0)} KB</span></div><button type="button">Download</button>`;
        card.querySelector('button').addEventListener('click', () => downloadBlob(blob, output.file));
        grid.appendChild(card);
      }
      document.getElementById('packResultTitle').textContent = `${pack.name} · ${generated.length} files ready`;
      result.hidden = false;
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (_) {
      alert('Could not read this image. Try JPG, PNG or WebP.');
    } finally {
      generate.disabled = false;
      generate.textContent = 'Generate pack';
    }
  });

  downloadAll.addEventListener('click', () => {
    if (!generated.length) return;
    generated.forEach((item, index) => setTimeout(() => downloadBlob(item.blob, item.file), index * 250));
  });
})();
