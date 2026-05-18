// =============================================
// APP.JS — DEPÓSITO MANAGER
// =============================================

// ---- Estado global ----
let currentUser = null;
let isAdmin = false;
let articles = [];
let filteredArticles = [];
let editingArticleId = null;
let photoFile = null;
let refPhotoFile = null;

// ---- Referencias DOM ----
const loadingScreen    = document.getElementById('loading-screen');
const mainContent      = document.getElementById('main-content');
const searchInput      = document.getElementById('search-input');
const searchClear      = document.getElementById('search-clear');
const articlesGrid     = document.getElementById('articles-grid');
const statsCount       = document.getElementById('stats-count');
const fab              = document.getElementById('fab-add');

// Modals
const loginModal       = document.getElementById('login-modal');
const articleModal     = document.getElementById('article-modal');
const detailModal      = document.getElementById('detail-modal');
const lightbox         = document.getElementById('lightbox');

// Login form
const loginEmail       = document.getElementById('login-email');
const loginPassword    = document.getElementById('login-password');
const loginError       = document.getElementById('login-error');
const loginBtn         = document.getElementById('login-btn');

// Article form
const articleForm      = document.getElementById('article-form');
const articleModalTitle= document.getElementById('article-modal-title');
const fieldName        = document.getElementById('field-name');
const fieldLocation    = document.getElementById('field-location');
const uploadPhoto      = document.getElementById('upload-photo');
const uploadRefPhoto   = document.getElementById('upload-ref-photo');
const previewPhoto     = document.getElementById('preview-photo');
const previewRefPhoto  = document.getElementById('preview-ref-photo');
const saveBtn          = document.getElementById('save-btn');
const saveBtnText      = document.getElementById('save-btn-text');
const uploadProgress   = document.getElementById('upload-progress');
const uploadProgressBar= document.getElementById('upload-progress-bar');

// Navbar
const navAdminActions  = document.getElementById('nav-admin-actions');
const navLoginBtn      = document.getElementById('nav-login-btn');
const navUserInfo      = document.getElementById('nav-user-info');
const navUserAvatar    = document.getElementById('nav-user-avatar');
const navLogoutBtn     = document.getElementById('nav-logout-btn');

// =============================================
// AUTH STATE
// =============================================
auth.onAuthStateChanged(user => {
  currentUser = user;
  isAdmin = user?.email === ADMIN_EMAIL;
  updateNavbar();
  loadArticles();
});

function updateNavbar() {
  if (isAdmin) {
    navAdminActions.style.display = 'flex';
    navLoginBtn.style.display = 'none';
    navUserInfo.style.display = 'flex';
    navUserAvatar.textContent = 'A';
    fab.style.display = 'flex';
  } else {
    navAdminActions.style.display = 'none';
    navUserInfo.style.display = 'none';
    navLoginBtn.style.display = 'flex';
    fab.style.display = 'none';
  }
}

// =============================================
// FIRESTORE — CARGAR ARTÍCULOS
// =============================================
function loadArticles() {
  showSkeletons();

  db.collection('articles')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      articles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      applySearch(searchInput.value.trim());
      hideLoading();
    }, err => {
      console.error('Error loading articles:', err);
      hideLoading();
      showToast('Error al cargar los artículos', 'error');
    });
}

function hideLoading() {
  loadingScreen.style.display = 'none';
  mainContent.style.display = 'block';
}

// =============================================
// RENDER ARTÍCULOS
// =============================================
function renderArticles(list) {
  articlesGrid.innerHTML = '';
  statsCount.innerHTML = `<span>${list.length}</span> artículo${list.length !== 1 ? 's' : ''}`;

  if (list.length === 0) {
    const q = searchInput.value.trim();
    articlesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${q ? '🔍' : '📦'}</div>
        <h3>${q ? 'Sin resultados' : 'Sin artículos'}</h3>
        <p>${q ? `No se encontró "${q}" en el depósito.` : 'El depósito está vacío. El admin puede agregar artículos.'}</p>
      </div>`;
    return;
  }

  list.forEach(article => {
    const card = document.createElement('div');
    card.className = 'article-card';
    card.onclick = () => openDetailModal(article);

    let deleteBtnHtml = '';
    if (isAdmin) {
      deleteBtnHtml = `
        <button class="card-delete-btn" title="Eliminar artículo" onclick="event.stopPropagation(); deleteArticleDirectly('${article.id}', '${escapeHtml(article.name).replace(/'/g, "\\'")}')">
          ✕
        </button>
      `;
    }

    card.innerHTML = `
      <div class="card-image-wrapper">
        ${deleteBtnHtml}
        ${article.photoUrl
          ? `<img src="${article.photoUrl}" alt="${escapeHtml(article.name)}" loading="lazy">`
          : `<div class="card-no-image"><div class="no-img-icon">📷</div><span>Sin foto</span></div>`
        }
      </div>
      <div class="card-body">
        <div class="card-name" title="${escapeHtml(article.name)}">${escapeHtml(article.name)}</div>
        <div class="card-location">
          <span class="loc-icon">📍</span>
          <span>${escapeHtml(article.location || '—')}</span>
        </div>
      </div>`;

    articlesGrid.appendChild(card);
  });
}

function showSkeletons() {
  articlesGrid.innerHTML = Array(6).fill('').map(() => `
    <div class="skeleton">
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    </div>`).join('');
}

// =============================================
// BÚSQUEDA
// =============================================
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  searchClear.classList.toggle('visible', q.length > 0);
  applySearch(q);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.remove('visible');
  applySearch('');
});

function applySearch(query) {
  const q = query.toLowerCase();
  filteredArticles = q
    ? articles.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q)
      )
    : [...articles];
  renderArticles(filteredArticles);
}

// =============================================
// LOGIN MODAL
// =============================================
navLoginBtn.addEventListener('click', () => openModal(loginModal));

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  loginError.classList.remove('show');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Ingresando...';

  try {
    await auth.signInWithEmailAndPassword(loginEmail.value.trim(), loginPassword.value);
    closeModal(loginModal);
    loginEmail.value = '';
    loginPassword.value = '';
    showToast('¡Bienvenido, admin!', 'success');
  } catch (err) {
    loginError.textContent = getAuthError(err.code);
    loginError.classList.add('show');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Ingresar';
  }
});

function getAuthError(code) {
  const msgs = {
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/user-not-found': 'Usuario no encontrado.',
    'auth/invalid-email': 'Email inválido.',
    'auth/too-many-requests': 'Demasiados intentos. Intentá más tarde.',
  };
  return msgs[code] || 'Error al iniciar sesión.';
}

navLogoutBtn.addEventListener('click', async () => {
  await auth.signOut();
  showToast('Sesión cerrada', 'success');
});

// =============================================
// MODAL AGREGAR / EDITAR ARTÍCULO
// =============================================
fab.addEventListener('click', () => {
  if (!isAdmin) return;
  editingArticleId = null;
  articleForm.reset();
  articleModalTitle.textContent = 'Agregar artículo';
  saveBtnText.textContent = 'Guardar';
  clearPreview('photo');
  clearPreview('ref');
  photoFile = null;
  refPhotoFile = null;
  openModal(articleModal);
});

// Upload handlers
uploadPhoto.addEventListener('change', e => handleFileSelect(e, 'photo'));
uploadRefPhoto.addEventListener('change', e => handleFileSelect(e, 'ref'));

// Drag & drop
[
  { zone: document.getElementById('zone-photo'), type: 'photo' },
  { zone: document.getElementById('zone-ref'), type: 'ref' }
].forEach(({ zone, type }) => {
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processImage(file, type);
  });
});

document.getElementById('remove-photo').addEventListener('click', e => {
  e.stopPropagation();
  clearPreview('photo');
  photoFile = null;
  uploadPhoto.value = '';
});

document.getElementById('remove-ref-photo').addEventListener('click', e => {
  e.stopPropagation();
  clearPreview('ref');
  refPhotoFile = null;
  uploadRefPhoto.value = '';
});

function handleFileSelect(e, type) {
  const file = e.target.files[0];
  if (file) processImage(file, type);
}

// =============================================
// COMPRESIÓN DE IMAGEN (< 1MB)
// =============================================
async function processImage(file, type) {
  if (!file.type.startsWith('image/')) {
    showToast('Solo se admiten imágenes', 'error');
    return;
  }

  try {
    const compressed = await compressImage(file, 900, 0.82);
    const url = URL.createObjectURL(compressed);

    if (type === 'photo') {
      photoFile = compressed;
      showPreview('photo', url, compressed.size);
    } else {
      refPhotoFile = compressed;
      showPreview('ref', url, compressed.size);
    }
  } catch (err) {
    showToast('Error al procesar la imagen', 'error');
  }
}

function compressImage(file, maxDimension = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = e => { img.src = e.target.result; };
    reader.onerror = reject;
    reader.readAsDataURL(file);

    img.onload = () => {
      let { width, height } = img;

      // Redimensionar si es muy grande
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round(height * maxDimension / width);
          width = maxDimension;
        } else {
          width = Math.round(width * maxDimension / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Compression failed')); return; }
        // Si aún es > 1MB, reducir calidad más
        if (blob.size > 950 * 1024) {
          const canvas2 = document.createElement('canvas');
          canvas2.width = width;
          canvas2.height = height;
          canvas2.getContext('2d').drawImage(img, 0, 0, width, height);
          canvas2.toBlob(b2 => resolve(b2 || blob), 'image/jpeg', 0.65);
        } else {
          resolve(blob);
        }
      }, 'image/jpeg', quality);
    };

    img.onerror = reject;
  });
}

function showPreview(type, url, size) {
  const previewEl = type === 'photo' ? previewPhoto : previewRefPhoto;
  const zoneEl = type === 'photo'
    ? document.getElementById('zone-photo')
    : document.getElementById('zone-ref');

  previewEl.querySelector('img').src = url;
  previewEl.querySelector('.upload-size-info').textContent =
    `Tamaño: ${(size / 1024).toFixed(0)} KB`;
  previewEl.style.display = 'block';
  zoneEl.querySelector('.upload-placeholder').style.display = 'none';
}

function clearPreview(type) {
  const previewEl = type === 'photo' ? previewPhoto : previewRefPhoto;
  const zoneEl = type === 'photo'
    ? document.getElementById('zone-photo')
    : document.getElementById('zone-ref');

  previewEl.style.display = 'none';
  previewEl.querySelector('img').src = '';
  zoneEl.querySelector('.upload-placeholder').style.display = 'flex';
}

// =============================================
// GUARDAR ARTÍCULO
// =============================================
articleForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!isAdmin) return;

  const name = fieldName.value.trim();
  const location = fieldLocation.value.trim();

  if (!name) { showToast('El nombre es requerido', 'error'); return; }

  saveBtn.disabled = true;
  saveBtnText.textContent = 'Guardando...';
  uploadProgress.classList.add('active');

  try {
    let photoUrl = editingArticleId
      ? (articles.find(a => a.id === editingArticleId)?.photoUrl || '')
      : '';
    let refPhotoUrl = editingArticleId
      ? (articles.find(a => a.id === editingArticleId)?.refPhotoUrl || '')
      : '';

    // Subir foto principal
    if (photoFile) {
      photoUrl = await uploadImage(photoFile, `articles/${Date.now()}_photo.jpg`, pct => {
        uploadProgressBar.style.width = `${pct * 0.5}%`;
      });
    }

    // Subir foto de referencia
    if (refPhotoFile) {
      refPhotoUrl = await uploadImage(refPhotoFile, `articles/${Date.now()}_ref.jpg`, pct => {
        uploadProgressBar.style.width = `${50 + pct * 0.5}%`;
      });
    }

    uploadProgressBar.style.width = '100%';

    const data = {
      name,
      location,
      photoUrl,
      refPhotoUrl,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (editingArticleId) {
      await db.collection('articles').doc(editingArticleId).update(data);
      showToast('Artículo actualizado', 'success');
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('articles').add(data);
      showToast('Artículo agregado', 'success');
    }

    closeModal(articleModal);
  } catch (err) {
    console.error(err);
    showToast('Error al guardar el artículo', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtnText.textContent = editingArticleId ? 'Actualizar' : 'Guardar';
    uploadProgress.classList.remove('active');
    uploadProgressBar.style.width = '0%';
  }
});

function uploadImage(blob, path, onProgress) {
  return new Promise((resolve, reject) => {
    const ref = storage.ref(path);
    const task = ref.put(blob);
    task.on('state_changed',
      snap => onProgress && onProgress(snap.bytesTransferred / snap.totalBytes * 100),
      reject,
      async () => resolve(await task.snapshot.ref.getDownloadURL())
    );
  });
}

// =============================================
// DETALLE DE ARTÍCULO
// =============================================
function openDetailModal(article) {
  document.getElementById('detail-name').textContent = article.name || '—';
  document.getElementById('detail-location').textContent = article.location || '—';

  const imgMain = document.getElementById('detail-img-main');
  const imgRef = document.getElementById('detail-img-ref');
  const imgMainWrap = document.getElementById('detail-img-main-wrap');
  const imgRefWrap = document.getElementById('detail-img-ref-wrap');

  if (article.photoUrl) {
    imgMain.src = article.photoUrl;
    imgMainWrap.style.display = 'block';
  } else {
    imgMainWrap.style.display = 'none';
  }

  if (article.refPhotoUrl) {
    imgRef.src = article.refPhotoUrl;
    imgRefWrap.style.display = 'block';
  } else {
    imgRefWrap.style.display = 'none';
  }

  // Lightbox
  imgMain.onclick = () => openLightbox(article.photoUrl);
  imgRef.onclick = () => openLightbox(article.refPhotoUrl);

  // Acciones admin
  const adminActions = document.getElementById('detail-admin-actions');
  if (isAdmin) {
    adminActions.style.display = 'flex';
    document.getElementById('detail-edit-btn').onclick = () => {
      closeModal(detailModal);
      openEditModal(article);
    };
    document.getElementById('detail-delete-btn').onclick = () => deleteArticle(article);
  } else {
    adminActions.style.display = 'none';
  }

  openModal(detailModal);
}

function openEditModal(article) {
  editingArticleId = article.id;
  articleModalTitle.textContent = 'Editar artículo';
  saveBtnText.textContent = 'Actualizar';
  fieldName.value = article.name || '';
  fieldLocation.value = article.location || '';
  photoFile = null;
  refPhotoFile = null;

  // Mostrar previews si existen
  if (article.photoUrl) {
    previewPhoto.querySelector('img').src = article.photoUrl;
    previewPhoto.querySelector('.upload-size-info').textContent = '';
    previewPhoto.style.display = 'block';
    document.getElementById('zone-photo').querySelector('.upload-placeholder').style.display = 'none';
  } else {
    clearPreview('photo');
  }

  if (article.refPhotoUrl) {
    previewRefPhoto.querySelector('img').src = article.refPhotoUrl;
    previewRefPhoto.querySelector('.upload-size-info').textContent = '';
    previewRefPhoto.style.display = 'block';
    document.getElementById('zone-ref').querySelector('.upload-placeholder').style.display = 'none';
  } else {
    clearPreview('ref');
  }

  openModal(articleModal);
}

async function deleteArticle(article) {
  if (!confirm(`¿Eliminar "${article.name}"? Esta acción no se puede deshacer.`)) return;
  try {
    await db.collection('articles').doc(article.id).delete();
    closeModal(detailModal);
    showToast('Artículo eliminado', 'success');
  } catch (err) {
    showToast('Error al eliminar', 'error');
  }
}

window.deleteArticleDirectly = async function(id, name) {
  if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return;
  try {
    await db.collection('articles').doc(id).delete();
    showToast('Artículo eliminado', 'success');
  } catch (err) {
    showToast('Error al eliminar', 'error');
  }
};

// =============================================
// LIGHTBOX
// =============================================
function openLightbox(url) {
  if (!url) return;
  document.getElementById('lightbox-img').src = url;
  lightbox.classList.add('open');
}

document.getElementById('lightbox-close').onclick = closeLightbox;
lightbox.addEventListener('click', e => {
  if (e.target === lightbox) closeLightbox();
});

function closeLightbox() {
  lightbox.classList.remove('open');
}

// =============================================
// MODAL UTILS
// =============================================
function openModal(modal) { modal.classList.add('open'); }
function closeModal(modal) { modal.classList.remove('open'); }

// Cerrar modales al click en overlay
[loginModal, articleModal, detailModal].forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal(modal);
  });
});

// Botones cerrar
document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.closeModal;
    closeModal(document.getElementById(id));
  });
});

// ESC para cerrar
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (lightbox.classList.contains('open')) { closeLightbox(); return; }
    [detailModal, articleModal, loginModal].forEach(m => m.classList.remove('open'));
  }
});

// =============================================
// TOAST
// =============================================
const toastContainer = document.getElementById('toast-container');

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

// =============================================
// UTILS
// =============================================
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
