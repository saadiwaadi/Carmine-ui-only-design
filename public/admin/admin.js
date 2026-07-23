(() => {
  const API_BASE = '/api';
  const TOKEN_KEY = 'carmine_admin_token';
  const EMAIL_KEY = 'carmine_admin_email';

  const loginScreen = document.getElementById('loginScreen');
  const app = document.getElementById('app');

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setSession(token, email) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EMAIL_KEY, email);
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
  }

  async function api(path, options = {}) {
    const token = getToken();
    const headers = Object.assign({}, options.headers || {});
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, Object.assign({}, options, { headers }));
    if (res.status === 401) {
      clearSession();
      showLogin();
      throw new Error('Session expired. Please sign in again.');
    }
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  function showLogin() {
    loginScreen.style.display = 'flex';
    app.style.display = 'none';
  }

  function showApp() {
    loginScreen.style.display = 'none';
    app.style.display = 'block';
    document.getElementById('whoEmail').textContent = localStorage.getItem(EMAIL_KEY) || '';
    loadServices();
    loadWork();
    loadReservations();
    loadReviews();
  }

  // ---------- login ----------
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials.');
      setSession(data.token, data.email);
      showApp();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearSession();
    showLogin();
  });

  // ---------- tabs ----------
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.panel-section').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // ---------- upload helper ----------
  async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const data = await api('/upload', { method: 'POST', body: formData });
    return data.url;
  }

  function wireUpload(fileInputId, uploadBtnId, urlInputId, previewId) {
    const fileInput = document.getElementById(fileInputId);
    const uploadBtn = document.getElementById(uploadBtnId);
    const urlInput = document.getElementById(urlInputId);
    const preview = document.getElementById(previewId);

    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      if (!fileInput.files[0]) return;
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Uploading…';
      try {
        const url = await uploadImage(fileInput.files[0]);
        urlInput.value = url;
        preview.src = url;
        preview.style.display = 'block';
      } catch (err) {
        alert(err.message);
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload';
      }
    });
    urlInput.addEventListener('input', () => {
      if (urlInput.value) {
        preview.src = urlInput.value;
        preview.style.display = 'block';
      } else {
        preview.style.display = 'none';
      }
    });
  }

  wireUpload('serviceImageFile', 'serviceUploadBtn', 'serviceImageUrl', 'servicePreview');
  wireUpload('workImageFile', 'workUploadBtn', 'workImageUrl', 'workPreview');

  // ================= SERVICES =================
  const serviceForm = document.getElementById('serviceForm');

  function resetServiceForm() {
    document.getElementById('serviceId').value = '';
    document.getElementById('serviceNumberLabel').value = '';
    document.getElementById('serviceOrder').value = '0';
    document.getElementById('serviceTitle').value = '';
    document.getElementById('serviceDescription').value = '';
    document.getElementById('servicePriceLabel').value = '';
    document.getElementById('serviceImageUrl').value = '';
    document.getElementById('servicePreview').style.display = 'none';
    document.getElementById('serviceFormStatus').textContent = '';
    document.getElementById('serviceFormTitle').textContent = 'Add Service';
  }

  document.getElementById('newServiceBtn').addEventListener('click', () => {
    resetServiceForm();
    serviceForm.style.display = 'block';
    serviceForm.scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('serviceCancelBtn').addEventListener('click', () => {
    serviceForm.style.display = 'none';
  });

  document.getElementById('serviceSaveBtn').addEventListener('click', async () => {
    const id = document.getElementById('serviceId').value;
    const statusEl = document.getElementById('serviceFormStatus');
    const payload = {
      numberLabel: document.getElementById('serviceNumberLabel').value.trim() || '01',
      order: Number(document.getElementById('serviceOrder').value) || 0,
      title: document.getElementById('serviceTitle').value.trim(),
      description: document.getElementById('serviceDescription').value.trim(),
      priceLabel: document.getElementById('servicePriceLabel').value.trim() || 'Contact for quote',
      imageUrl: document.getElementById('serviceImageUrl').value.trim(),
    };
    if (!payload.title || !payload.description || !payload.imageUrl) {
      statusEl.textContent = 'Title, description, and an image are required.';
      statusEl.className = 'form-status error';
      return;
    }
    try {
      if (id) {
        await api(`/services/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/services', { method: 'POST', body: JSON.stringify(payload) });
      }
      serviceForm.style.display = 'none';
      loadServices();
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.className = 'form-status error';
    }
  });

  async function loadServices() {
    const tbody = document.getElementById('servicesTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="empty-note">Loading…</td></tr>';
    try {
      const services = await api('/services');
      if (services.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-note">No services yet.</td></tr>';
        return;
      }
      tbody.innerHTML = services.map((s) => `
        <tr>
          <td><img class="thumb" src="${escapeHtml(s.imageUrl)}" alt=""></td>
          <td>${escapeHtml(s.numberLabel)}</td>
          <td>${escapeHtml(s.title)}</td>
          <td style="max-width:260px;">${escapeHtml(s.description)}</td>
          <td>${escapeHtml(s.priceLabel)}</td>
          <td>${s.order}</td>
          <td class="actions">
            <button class="btn btn-outline btn-small" data-edit="${s.id}">Edit</button>
            <button class="btn btn-danger btn-small" data-delete="${s.id}">Delete</button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('[data-edit]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const s = services.find((x) => x.id === Number(btn.dataset.edit));
          document.getElementById('serviceId').value = s.id;
          document.getElementById('serviceNumberLabel').value = s.numberLabel;
          document.getElementById('serviceOrder').value = s.order;
          document.getElementById('serviceTitle').value = s.title;
          document.getElementById('serviceDescription').value = s.description;
          document.getElementById('servicePriceLabel').value = s.priceLabel;
          document.getElementById('serviceImageUrl').value = s.imageUrl;
          const preview = document.getElementById('servicePreview');
          preview.src = s.imageUrl;
          preview.style.display = 'block';
          document.getElementById('serviceFormTitle').textContent = 'Edit Service';
          document.getElementById('serviceFormStatus').textContent = '';
          serviceForm.style.display = 'block';
          serviceForm.scrollIntoView({ behavior: 'smooth' });
        });
      });
      tbody.querySelectorAll('[data-delete]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this service?')) return;
          try {
            await api(`/services/${btn.dataset.delete}`, { method: 'DELETE' });
            loadServices();
          } catch (err) {
            alert(err.message);
          }
        });
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-note">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  // ================= WORK ITEMS =================
  const workForm = document.getElementById('workForm');

  function resetWorkForm() {
    document.getElementById('workId').value = '';
    document.getElementById('workVehicle').value = '';
    document.getElementById('workStatusLabel').value = '';
    document.getElementById('workReported').value = '';
    document.getElementById('workResolution').value = '';
    document.getElementById('workRating').value = '5';
    document.getElementById('workOrder').value = '0';
    document.getElementById('workQuote').value = '';
    document.getElementById('workImageUrl').value = '';
    document.getElementById('workPreview').style.display = 'none';
    document.getElementById('workFormStatus').textContent = '';
    document.getElementById('workFormTitle').textContent = 'Add Work Item';
  }

  document.getElementById('newWorkBtn').addEventListener('click', () => {
    resetWorkForm();
    workForm.style.display = 'block';
    workForm.scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('workCancelBtn').addEventListener('click', () => {
    workForm.style.display = 'none';
  });

  document.getElementById('workSaveBtn').addEventListener('click', async () => {
    const id = document.getElementById('workId').value;
    const statusEl = document.getElementById('workFormStatus');
    const payload = {
      vehicle: document.getElementById('workVehicle').value.trim(),
      statusLabel: document.getElementById('workStatusLabel').value.trim() || 'Closed',
      reported: document.getElementById('workReported').value.trim(),
      resolution: document.getElementById('workResolution').value.trim(),
      rating: Number(document.getElementById('workRating').value) || 5,
      order: Number(document.getElementById('workOrder').value) || 0,
      quote: document.getElementById('workQuote').value.trim(),
      imageUrl: document.getElementById('workImageUrl').value.trim(),
    };
    if (!payload.vehicle || !payload.reported || !payload.resolution || !payload.imageUrl) {
      statusEl.textContent = 'Vehicle, reported, resolution, and an image are required.';
      statusEl.className = 'form-status error';
      return;
    }
    try {
      if (id) {
        await api(`/work/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/work', { method: 'POST', body: JSON.stringify(payload) });
      }
      workForm.style.display = 'none';
      loadWork();
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.className = 'form-status error';
    }
  });

  async function loadWork() {
    const tbody = document.getElementById('workTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="empty-note">Loading…</td></tr>';
    try {
      const items = await api('/work');
      if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-note">No work items yet.</td></tr>';
        return;
      }
      tbody.innerHTML = items.map((w) => `
        <tr>
          <td><img class="thumb" src="${escapeHtml(w.imageUrl)}" alt=""></td>
          <td>${escapeHtml(w.vehicle)}</td>
          <td>${escapeHtml(w.statusLabel)}</td>
          <td style="max-width:200px;">${escapeHtml(w.reported)}</td>
          <td style="max-width:200px;">${escapeHtml(w.resolution)}</td>
          <td>${Number(w.rating).toFixed(1)}</td>
          <td class="actions">
            <button class="btn btn-outline btn-small" data-edit="${w.id}">Edit</button>
            <button class="btn btn-danger btn-small" data-delete="${w.id}">Delete</button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('[data-edit]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const w = items.find((x) => x.id === Number(btn.dataset.edit));
          document.getElementById('workId').value = w.id;
          document.getElementById('workVehicle').value = w.vehicle;
          document.getElementById('workStatusLabel').value = w.statusLabel;
          document.getElementById('workReported').value = w.reported;
          document.getElementById('workResolution').value = w.resolution;
          document.getElementById('workRating').value = w.rating;
          document.getElementById('workOrder').value = w.order;
          document.getElementById('workQuote').value = w.quote || '';
          document.getElementById('workImageUrl').value = w.imageUrl;
          const preview = document.getElementById('workPreview');
          preview.src = w.imageUrl;
          preview.style.display = 'block';
          document.getElementById('workFormTitle').textContent = 'Edit Work Item';
          document.getElementById('workFormStatus').textContent = '';
          workForm.style.display = 'block';
          workForm.scrollIntoView({ behavior: 'smooth' });
        });
      });
      tbody.querySelectorAll('[data-delete]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this work item?')) return;
          try {
            await api(`/work/${btn.dataset.delete}`, { method: 'DELETE' });
            loadWork();
          } catch (err) {
            alert(err.message);
          }
        });
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-note">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  // ================= RESERVATIONS =================
  document.getElementById('refreshReservationsBtn').addEventListener('click', loadReservations);

  async function loadReservations() {
    const tbody = document.getElementById('reservationsTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="empty-note">Loading…</td></tr>';
    try {
      const reservations = await api('/reservations');
      if (reservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-note">No reservations yet.</td></tr>';
        return;
      }
      tbody.innerHTML = reservations.map((r) => `
        <tr>
          <td>${escapeHtml(r.confirmationCode)}</td>
          <td>${escapeHtml(r.fullName)}<br><span style="color:var(--charcoal);">${escapeHtml(r.phone)}</span></td>
          <td>${escapeHtml(r.year)} ${escapeHtml(r.make)} ${escapeHtml(r.model)}<br><span style="color:var(--charcoal);">${escapeHtml(r.mileage)}</span></td>
          <td>${escapeHtml(r.serviceName)}<br><span style="color:var(--charcoal);">${escapeHtml(r.servicePrice)}</span></td>
          <td>${escapeHtml(r.date)} · ${escapeHtml(r.time)}</td>
          <td>
            <select class="status-select" data-id="${r.id}">
              ${['pending', 'confirmed', 'completed', 'cancelled'].map((s) => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </td>
          <td class="actions"><button class="btn btn-danger btn-small" data-delete="${r.id}">Delete</button></td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.status-select').forEach((sel) => {
        sel.addEventListener('change', async () => {
          try {
            await api(`/reservations/${sel.dataset.id}`, { method: 'PUT', body: JSON.stringify({ status: sel.value }) });
          } catch (err) {
            alert(err.message);
            loadReservations();
          }
        });
      });
      tbody.querySelectorAll('[data-delete]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this reservation?')) return;
          try {
            await api(`/reservations/${btn.dataset.delete}`, { method: 'DELETE' });
            loadReservations();
          } catch (err) {
            alert(err.message);
          }
        });
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-note">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  // ================= REVIEWS =================
  document.getElementById('refreshReviewsBtn').addEventListener('click', loadReviews);

  async function loadReviews() {
    const tbody = document.getElementById('reviewsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="empty-note">Loading…</td></tr>';
    try {
      const reviews = await api('/reviews/all');
      if (reviews.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-note">No reviews yet.</td></tr>';
        return;
      }
      tbody.innerHTML = reviews.map((r) => `
        <tr>
          <td><input type="text" value="${escapeHtml(r.authorName)}" data-field="authorName" data-id="${r.id}" style="width:120px; border:1px solid var(--line); padding:6px 8px;"></td>
          <td><input type="text" value="${escapeHtml(r.vehicle || '')}" data-field="vehicle" data-id="${r.id}" style="width:140px; border:1px solid var(--line); padding:6px 8px;"></td>
          <td><input type="number" min="1" max="5" value="${r.rating}" data-field="rating" data-id="${r.id}" style="width:56px; border:1px solid var(--line); padding:6px 8px;"></td>
          <td><textarea data-field="comment" data-id="${r.id}" rows="2" style="width:100%; min-width:220px; border:1px solid var(--line); padding:6px 8px;">${escapeHtml(r.comment)}</textarea></td>
          <td><span class="badge ${r.approved ? 'approved' : 'awaiting'}">${r.approved ? 'Approved' : 'Awaiting'}</span></td>
          <td class="actions">
            <button class="btn btn-outline btn-small" data-save="${r.id}">Save</button>
            <button class="btn btn-small" data-toggle="${r.id}" data-approved="${r.approved}">${r.approved ? 'Unpublish' : 'Approve'}</button>
            <button class="btn btn-danger btn-small" data-delete="${r.id}">Delete</button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('[data-save]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.save;
          const row = btn.closest('tr');
          const payload = {
            authorName: row.querySelector('[data-field="authorName"]').value.trim(),
            vehicle: row.querySelector('[data-field="vehicle"]').value.trim(),
            rating: Number(row.querySelector('[data-field="rating"]').value),
            comment: row.querySelector('[data-field="comment"]').value.trim(),
          };
          try {
            await api(`/reviews/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            loadReviews();
          } catch (err) {
            alert(err.message);
          }
        });
      });
      tbody.querySelectorAll('[data-toggle]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const approved = btn.dataset.approved === 'true';
          try {
            await api(`/reviews/${btn.dataset.toggle}`, { method: 'PUT', body: JSON.stringify({ approved: !approved }) });
            loadReviews();
          } catch (err) {
            alert(err.message);
          }
        });
      });
      tbody.querySelectorAll('[data-delete]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this review?')) return;
          try {
            await api(`/reviews/${btn.dataset.delete}`, { method: 'DELETE' });
            loadReviews();
          } catch (err) {
            alert(err.message);
          }
        });
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-note">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  // ---------- boot ----------
  if (getToken()) {
    showApp();
  } else {
    showLogin();
  }
})();
