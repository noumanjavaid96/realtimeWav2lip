/* global io */
(function () {
  'use strict';

  // ---- DOM refs ----
  const dropzone        = document.getElementById('dropzone');
  const dropzoneContent = document.getElementById('dropzoneContent');
  const fileInput       = document.getElementById('fileInput');
  const previewImage    = document.getElementById('previewImage');
  const fileInfo        = document.getElementById('fileInfo');
  const fileName        = document.getElementById('fileName');
  const clearFileBtn    = document.getElementById('clearFile');
  const uploadBtn       = document.getElementById('uploadBtn');
  const startBtn        = document.getElementById('startBtn');
  const stopBtn         = document.getElementById('stopBtn');
  const videoFeed       = document.getElementById('videoFeed');
  const videoPlaceholder= document.getElementById('videoPlaceholder');
  const toastArea       = document.getElementById('toastArea');
  const connectionBadge = document.getElementById('connectionBadge');
  const connectionText  = document.getElementById('connectionText');
  const backendStatus   = document.getElementById('backendStatus');
  const sessionStatus   = document.getElementById('sessionStatus');
  const menuToggle      = document.getElementById('menuToggle');
  const sidebar         = document.getElementById('sidebar');

  let selectedFile = null;

  // ---- Socket.IO ----
  const socket = io();

  socket.on('connect', () => {
    connectionBadge.className = 'connection-badge connected';
    connectionText.textContent = 'Connected';
  });

  socket.on('disconnect', () => {
    connectionBadge.className = 'connection-badge disconnected';
    connectionText.textContent = 'Disconnected';
  });

  socket.on('status', (data) => {
    showToast(data.message, data.type);
  });

  // ---- Toasts ----
  function showToast(message, type) {
    type = type || 'info';
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = message;
    toastArea.appendChild(el);
    setTimeout(() => { el.remove(); }, 4000);
  }

  // ---- Sidebar toggle (mobile) ----
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // ---- Dropzone ----
  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      handleFile(fileInput.files[0]);
    }
  });

  clearFileBtn.addEventListener('click', clearSelection);

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }
    selectedFile = file;
    fileName.textContent = file.name;
    fileInfo.hidden = false;
    uploadBtn.disabled = false;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      previewImage.hidden = false;
      dropzoneContent.hidden = true;
    };
    reader.readAsDataURL(file);
  }

  function clearSelection() {
    selectedFile = null;
    fileInput.value = '';
    previewImage.hidden = true;
    previewImage.src = '';
    dropzoneContent.hidden = false;
    fileInfo.hidden = true;
    uploadBtn.disabled = true;
  }

  // ---- Upload ----
  uploadBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    const btnText = uploadBtn.querySelector('.btn-text');
    const spinner = uploadBtn.querySelector('.spinner');
    uploadBtn.disabled = true;
    btnText.textContent = 'Uploading…';
    spinner.hidden = false;

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const res = await fetch('/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        showToast('Image uploaded successfully!', 'success');
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      showToast('Upload failed – is the backend running?', 'error');
    } finally {
      btnText.textContent = 'Upload Image';
      spinner.hidden = true;
      uploadBtn.disabled = false;
    }
  });

  // ---- Controls ----
  async function sendControl(action) {
    try {
      const res = await fetch('/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === 'start') {
          sessionStatus.textContent = 'Running';
          sessionStatus.style.color = 'var(--success)';
          // Show video feed
          videoFeed.src = '/video_feed';
          videoFeed.hidden = false;
          videoPlaceholder.hidden = true;
        } else {
          sessionStatus.textContent = 'Idle';
          sessionStatus.style.color = '';
          videoFeed.src = '';
          videoFeed.hidden = true;
          videoPlaceholder.hidden = false;
        }
      }
    } catch {
      showToast('Failed to communicate with backend', 'error');
    }
  }

  startBtn.addEventListener('click', () => sendControl('start'));
  stopBtn.addEventListener('click', () => sendControl('stop'));

  // ---- Health check ----
  async function checkHealth() {
    try {
      const res = await fetch('/health');
      const data = await res.json();
      if (data.flask === 'ok') {
        backendStatus.textContent = 'Online';
        backendStatus.style.color = 'var(--success)';
      } else {
        backendStatus.textContent = 'Offline';
        backendStatus.style.color = 'var(--danger)';
      }
    } catch {
      backendStatus.textContent = 'Offline';
      backendStatus.style.color = 'var(--danger)';
    }
  }

  checkHealth();
  setInterval(checkHealth, 15000);

})();
