/**
 * BEEFLOW Formulario de Auditoría de Servicio
 * Frontend Application & Official Multi-Page PDF Generator Engine
 */

// Global State
const state = {
  metadata: {
    campo: 'FUNDO SANTA TERESA',
    apicultor: 'JUAN CARLOS M.',
    fecha: new Date().toISOString().split('T')[0],
    proyecto: 'ARANDANO 2026',
    lote: 'LOTE 3B'
  },
  hives: [],
  currentView: 'form',
  filterQuery: '',
  zoomLevel: 'auto', // Default to auto-fit for 100% responsive viewing
  currentSheet: 'all' // 'all' (Ver Todo) or sheet number (1, 2, 3...)
};

// LocalStorage Key
const STORAGE_KEY = 'BEEFLOW_AUDIT_DATA_V1';

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  window.addEventListener('resize', () => {
    if (state.currentView === 'preview' && state.zoomLevel === 'auto') {
      adjustPreviewZoom('auto');
    }
  });
});

function initApp() {
  // Try loading from localStorage, or populate with Page 1 sample (C104-C143)
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.metadata) state.metadata = { ...state.metadata, ...parsed.metadata };
      if (Array.isArray(parsed.hives) && parsed.hives.length > 0) {
        state.hives = parsed.hives;
      } else {
        loadSampleData('page1', false);
      }
    } catch (e) {
      console.warn('Error reading saved data, initializing default', e);
      loadSampleData('page1', false);
    }
  } else {
    loadSampleData('page1', false);
  }

  // Populate metadata form inputs
  const elCampo = document.getElementById('meta-campo');
  const elApicultor = document.getElementById('meta-apicultor');
  const elFecha = document.getElementById('meta-fecha');
  const elProyecto = document.getElementById('meta-proyecto');
  const elLote = document.getElementById('meta-lote');

  if (elCampo) elCampo.value = state.metadata.campo || '';
  if (elApicultor) elApicultor.value = state.metadata.apicultor || '';
  if (elFecha) elFecha.value = state.metadata.fecha || '';
  if (elProyecto) elProyecto.value = state.metadata.proyecto || '';
  if (elLote) elLote.value = state.metadata.lote || '';

  // Render UI
  renderSheetNavBars();
  renderHivesTable();
  updateMetrics();
  renderOfficialSheets();
}

function saveDataToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    metadata: state.metadata,
    hives: state.hives
  }));
}

// Update metadata in state
function updateMetadata() {
  const elCampo = document.getElementById('meta-campo');
  const elApicultor = document.getElementById('meta-apicultor');
  const elFecha = document.getElementById('meta-fecha');
  const elProyecto = document.getElementById('meta-proyecto');
  const elLote = document.getElementById('meta-lote');

  if (elCampo) state.metadata.campo = elCampo.value.trim();
  if (elApicultor) state.metadata.apicultor = elApicultor.value.trim();
  if (elFecha) state.metadata.fecha = elFecha.value;
  if (elProyecto) state.metadata.proyecto = elProyecto.value.trim();
  if (elLote) state.metadata.lote = elLote.value.trim();

  saveDataToStorage();
  renderOfficialSheets();
}

// Switch between Tablet/Mobile Form and A4 Print Preview
function switchView(viewName) {
  state.currentView = viewName;
  const formPanel = document.getElementById('view-form');
  const previewPanel = document.getElementById('view-preview');
  const tabForm = document.getElementById('tab-btn-form');
  const tabPreview = document.getElementById('tab-btn-preview');

  if (viewName === 'form') {
    if (formPanel) formPanel.classList.remove('hidden');
    if (previewPanel) previewPanel.classList.add('hidden');
    if (tabForm) tabForm.classList.add('active');
    if (tabPreview) tabPreview.classList.remove('active');
    renderSheetNavBars();
    renderHivesTable();
  } else {
    if (formPanel) formPanel.classList.add('hidden');
    if (previewPanel) previewPanel.classList.remove('hidden');
    if (tabForm) tabForm.classList.remove('active');
    if (tabPreview) tabPreview.classList.add('active');
    renderSheetNavBars();
    renderOfficialSheets();
    // Auto-scale preview to 100% fit screen width
    setTimeout(() => {
      adjustPreviewZoom(state.zoomLevel);
    }, 50);
  }
}

// Adjust Zoom in Preview (Supports 100% Responsive Auto-Fit)
function adjustPreviewZoom(val) {
  state.zoomLevel = val;
  const stage = document.getElementById('print-preview-stage');
  const wrapper = document.getElementById('preview-stage-wrapper');
  if (!stage) return;

  if (val === 'auto') {
    const availableWidth = wrapper ? (wrapper.clientWidth - 20) : (window.innerWidth - 30);
    // 297mm in pixels at 96 DPI is ~1122.5px
    const a4PxWidth = 1122.5;
    const autoScale = Math.min(1.0, Math.max(0.25, availableWidth / a4PxWidth));
    stage.style.transform = `scale(${autoScale.toFixed(3)})`;
  } else {
    const scale = parseFloat(val) || 0.85;
    stage.style.transform = `scale(${scale})`;
  }
}

// Collapse/Expand Batch tools
function toggleBatchTools() {
  const body = document.getElementById('batch-tools-body');
  const txt = document.getElementById('batch-toggle-text');
  if (!body) return;

  if (body.style.display === 'none') {
    body.style.display = 'block';
    if (txt) txt.textContent = 'Ocultar Herramienta';
  } else {
    body.style.display = 'none';
    if (txt) txt.textContent = 'Mostrar Herramienta';
  }
}

// ==========================================================================
// SHEET NAVIGATION & MULTI-PAGE SYSTEM ("Ver Todo" y Navegación entre Hojas)
// ==========================================================================

function selectSheet(sheet) {
  state.currentSheet = sheet;
  renderSheetNavBars();
  renderHivesTable();
  renderOfficialSheets();

  const totalSheets = Math.max(1, Math.ceil(state.hives.length / 40));
  if (sheet === 'all') {
    showToast(`Mostrando todas las hojas (${totalSheets} ${totalSheets === 1 ? 'hoja' : 'hojas'}).`, 'info', 2200);
  } else {
    showToast(`Enfocando Hoja ${sheet} de ${totalSheets}.`, 'info', 2200);
  }
}

function addNewSheet() {
  const totalHives = state.hives.length;
  const currentSheets = Math.ceil(totalHives / 40);
  const newSheetNum = currentSheets + 1;

  let prefix = 'C';
  let startNum = 104;

  if (state.hives.length > 0) {
    const lastHive = state.hives[state.hives.length - 1];
    if (lastHive && lastHive.id) {
      const match = lastHive.id.match(/^([A-Za-z]+)(\d+)$/);
      if (match) {
        prefix = match[1];
        startNum = parseInt(match[2], 10) + 1;
      } else {
        startNum = 104 + state.hives.length;
      }
    }
  }

  // Look at default values from generator if present
  const isMaxpoll = document.getElementById('gen-maxpoll') ? document.getElementById('gen-maxpoll').checked : false;
  const isTobee = document.getElementById('gen-tobee') ? document.getElementById('gen-tobee').checked : false;
  const isTorta = document.getElementById('gen-torta') ? document.getElementById('gen-torta').checked : false;

  const newHives = [];
  for (let i = 0; i < 40; i++) {
    newHives.push({
      id: `${prefix}${startNum + i}`,
      marcos: '',
      muerta: false,
      maxpoll: isMaxpoll,
      tobee: isTobee,
      tortaP: isTorta
    });
  }

  state.hives.push(...newHives);
  state.currentSheet = 'all'; // Keep "Ver Todo" so the user sees the new sheet attached

  saveDataToStorage();
  renderSheetNavBars();
  renderHivesTable();
  updateMetrics();
  renderOfficialSheets();

  showToast(`¡Hoja ${newSheetNum} añadida con éxito! (40 colmenas: ${prefix}${startNum} a ${prefix}${startNum + 39}).`, 'success', 4000);
}

function renderSheetNavBars() {
  const formNav = document.getElementById('sheet-nav-form');
  const previewNav = document.getElementById('sheet-nav-preview');
  if (!formNav && !previewNav) return;

  const totalHives = state.hives.length;
  const totalSheets = Math.max(1, Math.ceil(totalHives / 40));

  // Sanitize currentSheet
  if (state.currentSheet !== 'all') {
    const num = parseInt(state.currentSheet, 10);
    if (isNaN(num) || num < 1 || num > totalSheets) {
      state.currentSheet = 'all';
    }
  }

  let tabsHtml = `
    <div class="sheet-tabs-scroll">
      <button type="button" class="sheet-tab ${state.currentSheet === 'all' ? 'active' : ''}" onclick="selectSheet('all')" title="Ver todas las colmenas y hojas en una sola vista">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span class="tab-title">Ver Todo (Todas las Hojas)</span>
        <span class="sheet-count-tag">${totalHives} colmenas • ${totalSheets} ${totalSheets === 1 ? 'hoja' : 'hojas'}</span>
      </button>
  `;

  for (let s = 1; s <= totalSheets; s++) {
    const startIdx = (s - 1) * 40;
    const endIdx = Math.min(totalHives, s * 40);
    const countInSheet = Math.max(0, endIdx - startIdx);
    const firstHive = state.hives[startIdx];
    const lastHive = state.hives[endIdx - 1];
    const rangeText = (firstHive && lastHive) ? `${firstHive.id} - ${lastHive.id}` : `Vacía`;

    tabsHtml += `
      <button type="button" class="sheet-tab ${state.currentSheet === s ? 'active' : ''}" onclick="selectSheet(${s})" title="Filtrar por Hoja ${s}">
        <span class="sheet-num-badge">Hoja ${s}</span>
        <span class="sheet-range-tag">${rangeText}</span>
        <span class="sheet-count-tag">(${countInSheet}/40)</span>
      </button>
    `;
  }

  tabsHtml += `
      <button type="button" class="btn btn-xs btn-primary btn-add-sheet" onclick="addNewSheet()" title="Genera e inserta 40 colmenas correlativas como una nueva hoja oficial">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        + Añadir Hoja (40)
      </button>
    </div>
  `;

  if (formNav) formNav.innerHTML = tabsHtml;
  if (previewNav) previewNav.innerHTML = tabsHtml;

  // Update generator "Desde Nº" automatically to avoid overlapping IDs
  const genStartInput = document.getElementById('gen-start');
  if (genStartInput && state.hives.length > 0) {
    const lastHive = state.hives[state.hives.length - 1];
    if (lastHive && lastHive.id) {
      const m = lastHive.id.match(/\d+$/);
      if (m) {
        genStartInput.value = parseInt(m[0], 10) + 1;
      }
    }
  }
}

function updateSheetBannerNotice(sheetNum, isViewingAll, totalSheets) {
  const noticeWrap = document.getElementById('sheet-banner-notice-wrap');
  if (!noticeWrap) return;

  if (isViewingAll) {
    noticeWrap.innerHTML = '';
  } else {
    const startIdx = (sheetNum - 1) * 40;
    const endIdx = Math.min(state.hives.length, sheetNum * 40);
    noticeWrap.innerHTML = `
      <div class="sheet-banner-notice">
        <span>Mostrando únicamente colmenas de la <strong>Hoja ${sheetNum} de ${totalSheets}</strong> (filas ${startIdx + 1} a ${endIdx} de ${state.hives.length}).</span>
        <button type="button" onclick="selectSheet('all')">Ver todas las hojas juntas</button>
      </div>
    `;
  }
}

// ==========================================================================
// DATA MANAGEMENT & OPERATIONS
// ==========================================================================

function addNewHiveRow(id = '', marcos = '', muerta = false, maxpoll = false, tobee = false, tortaP = false) {
  if (!id) {
    // Auto-generate next ID based on last item
    const lastHive = state.hives[state.hives.length - 1];
    if (lastHive && lastHive.id) {
      const match = lastHive.id.match(/^([A-Za-z]+)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2], 10) + 1;
        id = `${prefix}${num}`;
      } else {
        id = `C${state.hives.length + 104}`;
      }
    } else {
      id = `C${state.hives.length + 104}`;
    }
  }

  state.hives.push({
    id,
    marcos: marcos !== null && marcos !== undefined ? marcos.toString() : '',
    muerta: Boolean(muerta),
    maxpoll: Boolean(maxpoll),
    tobee: Boolean(tobee),
    tortaP: Boolean(tortaP)
  });

  saveDataToStorage();
  renderSheetNavBars();
  renderHivesTable();
  updateMetrics();
  renderOfficialSheets();
}

function removeHiveRow(index) {
  state.hives.splice(index, 1);
  saveDataToStorage();
  renderSheetNavBars();
  renderHivesTable();
  updateMetrics();
  renderOfficialSheets();
}

function updateHiveField(index, field, value) {
  if (!state.hives[index]) return;
  
  if (field === 'marcos') {
    // Only allow digits (0-10)
    let clean = value.replace(/[^0-9]/g, '');
    if (clean.length > 2) clean = clean.slice(0, 2);
    state.hives[index].marcos = clean;
  } else if (field === 'id') {
    state.hives[index].id = value.toUpperCase().trim();
  } else {
    state.hives[index][field] = Boolean(value);
  }

  saveDataToStorage();
  updateMetrics();
  renderOfficialSheets();
}

function toggleHiveCheck(index, field) {
  if (!state.hives[index]) return;
  state.hives[index][field] = !state.hives[index][field];
  
  // If marked dead, set marcos to 0
  if (field === 'muerta' && state.hives[index].muerta) {
    state.hives[index].marcos = '0';
  }

  saveDataToStorage();
  renderHivesTable();
  updateMetrics();
  renderOfficialSheets();
}

// Quick Stepper for Marcos
function stepMarcos(index, delta) {
  if (!state.hives[index]) return;
  let current = parseInt(state.hives[index].marcos, 10);
  if (isNaN(current)) current = 0;
  let next = Math.max(0, Math.min(10, current + delta));
  state.hives[index].marcos = next.toString();

  saveDataToStorage();
  renderHivesTable();
  updateMetrics();
  renderOfficialSheets();
}

// Bulk Generator
function generateBatchHives(mode = 'append') {
  const prefix = document.getElementById('gen-prefix').value.trim() || 'C';
  const start = parseInt(document.getElementById('gen-start').value, 10) || 104;
  const count = parseInt(document.getElementById('gen-count').value, 10) || 40;
  const isMaxpoll = document.getElementById('gen-maxpoll').checked;
  const isTobee = document.getElementById('gen-tobee').checked;
  const isTorta = document.getElementById('gen-torta').checked;

  if (count <= 0 || isNaN(count)) {
    showToast('Por favor ingresa una cantidad válida de colmenas (mínimo 1).', 'warning');
    return;
  }

  const newHives = [];
  for (let i = 0; i < count; i++) {
    const num = start + i;
    newHives.push({
      id: `${prefix}${num}`,
      marcos: '',
      muerta: false,
      maxpoll: isMaxpoll,
      tobee: isTobee,
      tortaP: isTorta
    });
  }

  if (mode === 'replace' && state.hives.length > 0) {
    showConfirmModal({
      title: '¿Reemplazar colmenas actuales?',
      message: `Esta acción reemplazará las ${state.hives.length} colmenas registradas por las ${count} nuevas (${prefix}${start} a ${prefix}${start + count - 1}).`,
      confirmText: 'Sí, reemplazar',
      cancelText: 'Cancelar',
      isDanger: false,
      onConfirm: () => {
        state.hives = newHives;
        state.currentSheet = 'all';
        saveDataToStorage();
        renderSheetNavBars();
        renderHivesTable();
        updateMetrics();
        renderOfficialSheets();
        const totalSheets = Math.ceil(state.hives.length / 40);
        showToast(`Se reemplazó el lote: ${count} colmenas (${totalSheets} ${totalSheets === 1 ? 'hoja' : 'hojas'}).`, 'success');
      }
    });
    return;
  }

  if (mode === 'replace') {
    state.hives = newHives;
  } else {
    state.hives.push(...newHives);
  }

  state.currentSheet = 'all';
  saveDataToStorage();
  renderSheetNavBars();
  renderHivesTable();
  updateMetrics();
  renderOfficialSheets();

  const totalSheets = Math.ceil(state.hives.length / 40);
  showToast(`Se añadieron ${count} colmenas (${prefix}${start} a ${prefix}${start + count - 1}). Lote total: ${state.hives.length} colmenas (${totalSheets} ${totalSheets === 1 ? 'hoja' : 'hojas'}).`, 'success');
}

// Bulk toggle marks
function bulkSetMarks(field, val) {
  if (state.hives.length === 0) return;
  state.hives.forEach(h => {
    h[field] = val;
  });
  saveDataToStorage();
  renderHivesTable();
  updateMetrics();
  renderOfficialSheets();
  const labelNames = { maxpoll: 'Maxpoll', tobee: 'ToBEE', tortaP: 'Torta Proteica', muerta: 'Muerta' };
  showToast(`Se marcó "${labelNames[field] || field}" en todas las colmenas registradas.`, 'info');
}

// Clear all data
function clearAllData() {
  if (state.hives.length === 0) {
    showToast('El lote ya se encuentra vacío.', 'info');
    return;
  }

  showConfirmModal({
    title: '¿Vaciar todas las colmenas?',
    message: `Se eliminarán permanentemente las ${state.hives.length} colmenas registradas. Esta acción no se puede deshacer.`,
    confirmText: 'Sí, vaciar lote',
    cancelText: 'Cancelar',
    isDanger: true,
    onConfirm: () => {
      state.hives = [];
      state.currentSheet = 'all';
      saveDataToStorage();
      renderSheetNavBars();
      renderHivesTable();
      updateMetrics();
      renderOfficialSheets();
      showToast('Se vaciaron todas las colmenas registradas.', 'info');
    }
  });
}

// Load Official Sample Datasets from the PDF
function loadSampleData(sampleType, notify = true) {
  let sampleList = [];
  let description = '';

  if (sampleType === 'all') {
    // Both Page 1 and Page 2 (80 hives = 2 sheets)
    // Page 1: C104-C143
    for (let i = 104; i <= 143; i++) {
      sampleList.push({
        id: `C${i}`,
        marcos: '',
        muerta: false,
        maxpoll: true,
        tobee: true,
        tortaP: false
      });
    }
    // Page 2: C144-C183
    for (let i = 144; i <= 183; i++) {
      sampleList.push({
        id: `C${i}`,
        marcos: '',
        muerta: false,
        maxpoll: false,
        tobee: false,
        tortaP: false
      });
    }
    description = '2 hojas oficiales (80 colmenas: C104-C183)';
  } else if (sampleType === 'page1') {
    // Exact clone of Page 1 in original PDF: C104 to C143 (40 colmenas)
    for (let i = 104; i <= 143; i++) {
      sampleList.push({
        id: `C${i}`,
        marcos: '',
        muerta: false,
        maxpoll: true,
        tobee: true,
        tortaP: false
      });
    }
    description = 'Pág 1 Oficial (40 colmenas: C104-C143)';
  } else if (sampleType === 'page2') {
    // Exact clone of Page 2 in original PDF: C144 to C183 (40 colmenas)
    for (let i = 144; i <= 183; i++) {
      sampleList.push({
        id: `C${i}`,
        marcos: '',
        muerta: false,
        maxpoll: false,
        tobee: false,
        tortaP: false
      });
    }
    description = 'Pág 2 Oficial (40 colmenas: C144-C183)';
  }

  state.hives = sampleList;
  state.currentSheet = 'all';
  saveDataToStorage();
  renderSheetNavBars();
  renderHivesTable();
  updateMetrics();
  renderOfficialSheets();

  if (notify) {
    showToast(`Plantilla cargada con éxito: ${description}.`, 'success');
  }
}

// Filter Hive List
function filterHiveList() {
  state.filterQuery = document.getElementById('search-input').value.toLowerCase().trim();
  renderHivesTable();
}

// ==========================================================================
// RENDER TABLET / MOBILE ENTRY TABLE
// ==========================================================================
function renderHivesTable() {
  const tbody = document.getElementById('hives-tbody');
  if (!tbody) return;

  const totalHives = state.hives.length;
  const totalSheets = Math.max(1, Math.ceil(totalHives / 40));
  const query = state.filterQuery;

  let displayedHives = [];
  const isViewingAll = state.currentSheet === 'all';
  const sheetNum = isViewingAll ? 1 : parseInt(state.currentSheet, 10) || 1;

  if (isViewingAll) {
    displayedHives = state.hives.map((h, i) => ({ hive: h, realIndex: i }));
  } else {
    const startIdx = (sheetNum - 1) * 40;
    const endIdx = sheetNum * 40;
    displayedHives = state.hives
      .slice(startIdx, endIdx)
      .map((h, i) => ({ hive: h, realIndex: startIdx + i }));
  }

  // Update banner notice if filtering by single sheet
  updateSheetBannerNotice(sheetNum, isViewingAll, totalSheets);

  // Apply search query
  if (query) {
    displayedHives = displayedHives.filter(item => {
      const h = item.hive;
      return (h.id && h.id.toLowerCase().includes(query)) || ((item.realIndex + 1).toString() === query);
    });
  }

  const badgeCount = document.getElementById('badge-count');
  if (badgeCount) {
    badgeCount.textContent = `${totalHives} colmenas (${totalSheets} ${totalSheets === 1 ? 'hoja' : 'hojas'})`;
  }

  if (displayedHives.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
          ${query ? 'No se encontraron colmenas con ese criterio.' : 'No hay colmenas en esta vista. Añade una fila o genera una nueva hoja.'}
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  displayedHives.forEach((item) => {
    const realIndex = item.realIndex;
    const hive = item.hive;
    const isDead = hive.muerta;

    // In "Ver Todo" without search, insert separator row between sheets (after row 40, 80...)
    if (isViewingAll && !query && realIndex > 0 && realIndex % 40 === 0) {
      const thisSheetNum = Math.floor(realIndex / 40) + 1;
      const sheetEnd = Math.min(totalHives, realIndex + 40);
      html += `
        <tr class="tr-sheet-divider">
          <td colspan="8">
            <div class="sheet-divider-content">
              <span class="sheet-divider-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Inicio de Hoja ${thisSheetNum} (A4 Oficial)
              </span>
              <span class="sheet-divider-sub">Colmenas ${realIndex + 1} a ${sheetEnd} • 20 col. izquierda + 20 col. derecha</span>
            </div>
          </td>
        </tr>
      `;
    }

    html += `
      <tr class="${isDead ? 'row-dead' : ''}">
        <td style="color: #94a3b8; font-weight: 600; font-size: 0.8rem;">${realIndex + 1}</td>
        <td>
          <input type="text" class="row-id-input" value="${escapeHtml(hive.id)}" 
                 onchange="updateHiveField(${realIndex}, 'id', this.value)"
                 placeholder="Ej. C104">
        </td>
        <td>
          <div class="marcos-input-wrap">
            <button type="button" class="marcos-btn" onclick="stepMarcos(${realIndex}, -1)">-</button>
            <input type="text" class="marcos-input" value="${escapeHtml(hive.marcos)}" 
                   placeholder="-" maxlength="2"
                   onchange="updateHiveField(${realIndex}, 'marcos', this.value)">
            <button type="button" class="marcos-btn" onclick="stepMarcos(${realIndex}, 1)">+</button>
          </div>
        </td>
        <td class="text-center">
          <button type="button" class="toggle-cell-btn btn-dead ${hive.muerta ? 'checked' : ''}" 
                  onclick="toggleHiveCheck(${realIndex}, 'muerta')" title="Marcar colmena muerta">
            ${hive.muerta ? 'X' : ''}
          </button>
        </td>
        <td class="text-center">
          <button type="button" class="toggle-cell-btn btn-gold ${hive.maxpoll ? 'checked' : ''}" 
                  onclick="toggleHiveCheck(${realIndex}, 'maxpoll')" title="Marcar Maxpoll">
            ${hive.maxpoll ? 'X' : ''}
          </button>
        </td>
        <td class="text-center">
          <button type="button" class="toggle-cell-btn btn-gold ${hive.tobee ? 'checked' : ''}" 
                  onclick="toggleHiveCheck(${realIndex}, 'tobee')" title="Marcar ToBEE">
            ${hive.tobee ? 'X' : ''}
          </button>
        </td>
        <td class="text-center">
          <button type="button" class="toggle-cell-btn ${hive.tortaP ? 'checked' : ''}" 
                  onclick="toggleHiveCheck(${realIndex}, 'tortaP')" title="Marcar Torta Proteica">
            ${hive.tortaP ? 'X' : ''}
          </button>
        </td>
        <td class="text-center">
          <button type="button" class="btn-del-row" onclick="removeHiveRow(${realIndex})" title="Eliminar fila">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// Update Top Metrics
function updateMetrics() {
  const total = state.hives.length;
  let marcosSum = 0;
  let marcosCount = 0;
  let muertas = 0;

  state.hives.forEach(h => {
    if (h.muerta) muertas++;
    const m = parseInt(h.marcos, 10);
    if (!isNaN(m) && m > 0) {
      marcosSum += m;
      marcosCount++;
    }
  });

  const avg = marcosCount > 0 ? (marcosSum / marcosCount).toFixed(1) : '0.0';
  const totalPages = Math.max(1, Math.ceil(total / 40));

  const statTotal = document.getElementById('stat-total');
  const statAvg = document.getElementById('stat-avg-marcos');
  const statMuertas = document.getElementById('stat-muertas');
  const statPages = document.getElementById('stat-pages');

  if (statTotal) statTotal.textContent = total;
  if (statAvg) statAvg.textContent = avg;
  if (statMuertas) statMuertas.textContent = muertas;
  if (statPages) statPages.textContent = totalPages;
}

// ==========================================================================
// OFFICIAL BEEFLOW DOCUMENT RENDER ENGINE
// Clones 100% the exact visual layout from original PDF
// ==========================================================================

function buildSingleSheetHtml(pageIndex, totalPages) {
  const startIdx = (pageIndex - 1) * 40;
  const leftHives = state.hives.slice(startIdx, startIdx + 20);
  const rightHives = state.hives.slice(startIdx + 20, startIdx + 40);

  const leftRowsHtml = buildColumnRowsHtml(leftHives, 20);
  const rightRowsHtml = buildColumnRowsHtml(rightHives, 20);
  const dateFormatted = formatDateForPrint(state.metadata.fecha);

  return `
    <div class="beeflow-sheet" data-sheet-page="${pageIndex}">
      <!-- Document Title -->
      <div class="beeflow-doc-title">
        Formulario de auditoria de servicio - BEEFLOW
      </div>

      <!-- Instructions (Exact wording from original) -->
      <div class="beeflow-instructions">
        <div><span class="inst-title">INSTRUCCIONES:</span> Escriba un solo digito claro dentro de cada recuadro para el numero de marcos cubiertos con abejas.</div>
        <div>Marque con "X" en el recuadro de Muerta, Maxpoll, ToBEE, Torta P. en caso que corresponda.</div>
      </div>

      <!-- Metadata Header Grid -->
      <div class="beeflow-meta-row">
        <div class="beeflow-meta-item">
          <span class="beeflow-meta-label">CAMPO:</span>
          <span class="beeflow-meta-value">${escapeHtml(state.metadata.campo || '')}</span>
        </div>
        <div class="beeflow-meta-item">
          <span class="beeflow-meta-label">APICULTOR:</span>
          <span class="beeflow-meta-value">${escapeHtml(state.metadata.apicultor || '')}</span>
        </div>
        <div class="beeflow-meta-item" style="justify-content: flex-end;">
          <span class="beeflow-meta-label">FECHA:</span>
          <span class="beeflow-meta-value">${escapeHtml(dateFormatted)}</span>
        </div>
        <div class="beeflow-meta-item">
          <span class="beeflow-meta-label">PROYECTO:</span>
          <span class="beeflow-meta-value">${escapeHtml(state.metadata.proyecto || '')}</span>
        </div>
        <div class="beeflow-meta-item">
          <span class="beeflow-meta-label">LOTE:</span>
          <span class="beeflow-meta-value">${escapeHtml(state.metadata.lote || '')}</span>
        </div>
        <div></div>
      </div>

      <!-- Two Columns Side by Side -->
      <div class="beeflow-tables-wrapper">
        <!-- Left Table (20 items) -->
        <table class="beeflow-column-table">
          <thead>
            <tr>
              <th class="th-id">N°</th>
              <th class="th-marcos">Marcos</th>
              <th class="th-muerta">Muerta</th>
              <th class="th-maxpoll">Maxpoll</th>
              <th class="th-tobee">Tobee</th>
              <th class="th-torta">Torta P.</th>
            </tr>
          </thead>
          <tbody>
            ${leftRowsHtml}
          </tbody>
        </table>

        <!-- Right Table (20 items) -->
        <table class="beeflow-column-table">
          <thead>
            <tr>
              <th class="th-id">N°</th>
              <th class="th-marcos">Marcos</th>
              <th class="th-muerta">Muerta</th>
              <th class="th-maxpoll">Maxpoll</th>
              <th class="th-tobee">Tobee</th>
              <th class="th-torta">Torta P.</th>
            </tr>
          </thead>
          <tbody>
            ${rightRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- Footer OCR Note (Exact position and text) -->
      <div class="beeflow-footer-note">
        Nota: la columna N° queda vacia a proposito; el sistema OCR no la interpreta.
      </div>

      <!-- Page Indicator -->
      <div class="sheet-page-indicator">
        Hoja ${pageIndex} de ${totalPages}
      </div>
    </div>
  `;
}

function renderOfficialSheets() {
  const previewStage = document.getElementById('print-preview-stage');
  const officialContainer = document.getElementById('official-document-container');
  if (!previewStage && !officialContainer) return;

  const totalHives = state.hives.length;
  const totalPages = Math.max(1, Math.ceil(totalHives / 40));

  // Build all sheets for officialContainer (ALWAYS contains ALL pages for window.print and full export)
  let allSheetsHtml = '';
  for (let p = 1; p <= totalPages; p++) {
    allSheetsHtml += buildSingleSheetHtml(p, totalPages);
  }
  if (officialContainer) {
    officialContainer.innerHTML = allSheetsHtml;
  }

  // Build sheets for previewStage based on state.currentSheet
  if (previewStage) {
    if (state.currentSheet === 'all') {
      previewStage.innerHTML = allSheetsHtml;
    } else {
      const pageNum = Math.min(totalPages, Math.max(1, parseInt(state.currentSheet, 10) || 1));
      previewStage.innerHTML = buildSingleSheetHtml(pageNum, totalPages);
    }
    adjustPreviewZoom(state.zoomLevel);
  }

  // Update preview status text
  const previewCounter = document.getElementById('preview-sheet-counter-text');
  if (previewCounter) {
    if (state.currentSheet === 'all') {
      previewCounter.textContent = `Mostrando documento completo: ${totalPages} ${totalPages === 1 ? 'hoja' : 'hojas'} (${totalHives} colmenas). Formato A4 oficial listo para exportar.`;
    } else {
      const startIdx = (state.currentSheet - 1) * 40;
      const countInThis = state.hives.slice(startIdx, startIdx + 40).length;
      previewCounter.textContent = `Mostrando Hoja ${state.currentSheet} de ${totalPages} (${countInThis} colmenas). Formato A4 oficial listo para exportar.`;
    }
  }

  // Update download button labels
  const btnExportAllLabel = document.getElementById('btn-export-all-label');
  const btnExportCurrent = document.getElementById('btn-export-current');
  const btnExportHeader = document.getElementById('btn-export-pdf');

  if (btnExportAllLabel) {
    btnExportAllLabel.textContent = `Descargar PDF (${totalPages} ${totalPages === 1 ? 'Hoja' : 'Hojas'})`;
  }
  if (btnExportHeader) {
    btnExportHeader.title = `Exportar reporte completo (${totalPages} ${totalPages === 1 ? 'hoja' : 'hojas'}) en PDF`;
  }
  if (btnExportCurrent) {
    if (state.currentSheet !== 'all' && totalPages > 1) {
      btnExportCurrent.style.display = 'inline-flex';
      btnExportCurrent.textContent = `Descargar Hoja ${state.currentSheet} (PDF)`;
    } else {
      btnExportCurrent.style.display = totalPages > 1 ? 'inline-flex' : 'none';
      btnExportCurrent.textContent = `Descargar Hoja 1 (PDF)`;
    }
  }
}

// Generate rows for 1 table column (always exactly 20 rows to keep rigid A4 height)
function buildColumnRowsHtml(hivesArray, targetRows = 20) {
  let rowsHtml = '';

  for (let r = 0; r < targetRows; r++) {
    const hive = hivesArray[r];

    if (hive && hive.id) {
      const marcosVal = hive.marcos ? escapeHtml(hive.marcos) : '';
      
      const muertaCell = hive.muerta 
        ? `<span class="beeflow-box-x">X</span>` 
        : `<span class="beeflow-box"></span>`;

      const maxpollCell = hive.maxpoll 
        ? `<span class="beeflow-box-x">X</span>` 
        : `<span class="beeflow-box"></span>`;

      const tobeeCell = hive.tobee 
        ? `<span class="beeflow-box-x">X</span>` 
        : `<span class="beeflow-box"></span>`;

      const tortaCell = hive.tortaP 
        ? `<span class="beeflow-box-x">X</span>` 
        : `<span class="beeflow-box"></span>`;

      rowsHtml += `
        <tr>
          <td class="td-id">${escapeHtml(hive.id)}</td>
          <td class="td-marcos"><span class="marcos-ocr-box">${marcosVal}</span></td>
          <td class="td-box">${muertaCell}</td>
          <td class="td-box">${maxpollCell}</td>
          <td class="td-box">${tobeeCell}</td>
          <td class="td-box">${tortaCell}</td>
        </tr>
      `;
    } else {
      // Empty row (matches original form where unused rows keep empty checkboxes)
      rowsHtml += `
        <tr>
          <td class="td-id"></td>
          <td class="td-marcos"><span class="marcos-ocr-box"></span></td>
          <td class="td-box"><span class="beeflow-box"></span></td>
          <td class="td-box"><span class="beeflow-box"></span></td>
          <td class="td-box"><span class="beeflow-box"></span></td>
          <td class="td-box"><span class="beeflow-box"></span></td>
        </tr>
      `;
    }
  }

  return rowsHtml;
}

// Format date nicely for print
function formatDateForPrint(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Escape HTML utility
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================================
// EXPORT FUNCTIONS: MULTI-PAGE DIRECT PDF & DATA FILES
// ==========================================================================

async function exportDirectPDF(scope = 'all') {
  const totalHives = state.hives.length;
  const totalPages = Math.max(1, Math.ceil(totalHives / 40));

  let targetPages = [];
  if (scope === 'current') {
    const pageNum = state.currentSheet === 'all' ? 1 : Math.min(totalPages, Math.max(1, parseInt(state.currentSheet, 10)));
    targetPages.push(pageNum);
  } else {
    for (let p = 1; p <= totalPages; p++) {
      targetPages.push(p);
    }
  }

  showPdfProgressModal(targetPages.length);

  try {
    const jsPdfClass = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (typeof jsPDF !== 'undefined' ? jsPDF : null);

    if (!jsPdfClass || typeof html2canvas === 'undefined') {
      throw new Error('Módulos jsPDF o html2canvas no disponibles');
    }

    const pdf = new jsPdfClass({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Create an isolated sandbox at exact 297mm x 210mm
    const sandbox = document.createElement('div');
    sandbox.id = 'pdf-export-sandbox';
    sandbox.style.position = 'fixed';
    sandbox.style.top = '0';
    sandbox.style.left = '0';
    sandbox.style.width = '297mm';
    sandbox.style.height = '210mm';
    sandbox.style.zIndex = '99990';
    sandbox.style.background = '#ffffff';
    sandbox.style.overflow = 'hidden';
    sandbox.style.margin = '0';
    sandbox.style.padding = '0';
    document.body.appendChild(sandbox);

    for (let i = 0; i < targetPages.length; i++) {
      const pageIndex = targetPages[i];
      updatePdfProgress(i + 1, targetPages.length, `Renderizando Hoja ${pageIndex} de ${totalPages} en alta resolución...`);

      sandbox.innerHTML = buildSingleSheetHtml(pageIndex, totalPages);

      // Wait a moment for layout rendering and fonts
      await new Promise(resolve => setTimeout(resolve, 80));

      const sheetEl = sandbox.querySelector('.beeflow-sheet');
      const canvas = await html2canvas(sheetEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: sheetEl.offsetWidth,
        height: sheetEl.offsetHeight
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      if (i > 0) {
        pdf.addPage('a4', 'landscape');
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
    }

    if (sandbox.parentNode) {
      sandbox.parentNode.removeChild(sandbox);
    }

    const cleanCampo = (state.metadata.campo || 'Auditoria').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanFecha = (state.metadata.fecha || '2026').replace(/[^a-zA-Z0-9_-]/g, '-');
    const scopeSuffix = targetPages.length === 1 && totalPages > 1 ? `_Hoja${targetPages[0]}` : `_Completo_${totalPages}Hojas`;
    const fileName = `BEEFLOW_${cleanCampo}_${cleanFecha}${scopeSuffix}.pdf`;

    pdf.save(fileName);
    hidePdfProgressModal();
    showToast(`¡Documento PDF descargado con éxito! (${targetPages.length} ${targetPages.length === 1 ? 'hoja' : 'hojas'}).`, 'success');

  } catch (err) {
    console.warn('Detalle al exportar con canvas:', err);
    hidePdfProgressModal();
    const sandbox = document.getElementById('pdf-export-sandbox');
    if (sandbox && sandbox.parentNode) sandbox.parentNode.removeChild(sandbox);
    showToast('Abriendo ventana de impresión oficial para guardar PDF vectorial...', 'info');
    window.print();
  }
}

// Export JSON
function exportDataJSON() {
  const data = {
    metadata: state.metadata,
    hives: state.hives,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BEEFLOW_Datos_${state.metadata.campo || 'Lote'}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Archivo JSON exportado correctamente.', 'success');
}

// Import JSON
function importDataJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.metadata) state.metadata = { ...state.metadata, ...data.metadata };
      if (Array.isArray(data.hives)) state.hives = data.hives;
      
      // Update form fields
      const elCampo = document.getElementById('meta-campo');
      const elApicultor = document.getElementById('meta-apicultor');
      const elFecha = document.getElementById('meta-fecha');
      const elProyecto = document.getElementById('meta-proyecto');
      const elLote = document.getElementById('meta-lote');

      if (elCampo) elCampo.value = state.metadata.campo || '';
      if (elApicultor) elApicultor.value = state.metadata.apicultor || '';
      if (elFecha) elFecha.value = state.metadata.fecha || '';
      if (elProyecto) elProyecto.value = state.metadata.proyecto || '';
      if (elLote) elLote.value = state.metadata.lote || '';

      state.currentSheet = 'all';
      saveDataToStorage();
      renderSheetNavBars();
      renderHivesTable();
      updateMetrics();
      renderOfficialSheets();
      const totalSheets = Math.ceil(state.hives.length / 40);
      showToast(`Datos importados con éxito: ${state.hives.length} colmenas (${totalSheets} ${totalSheets === 1 ? 'hoja' : 'hojas'}).`, 'success');
    } catch (err) {
      showToast('Error al leer el archivo JSON: ' + err.message, 'error');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// Export CSV for Excel Analysis
function exportDataCSV() {
  let csv = 'Numero,Identificador,Marcos,Muerta,Maxpoll,Tobee,Torta_P\n';
  state.hives.forEach((h, i) => {
    csv += `${i + 1},"${h.id}","${h.marcos}","${h.muerta ? 'X' : ''}","${h.maxpoll ? 'X' : ''}","${h.tobee ? 'X' : ''}","${h.tortaP ? 'X' : ''}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BEEFLOW_Auditoria_${state.metadata.campo || 'Lote'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Archivo CSV exportado correctamente.', 'success');
}

// ==========================================================================
// TOAST NOTIFICATIONS & MODALS (Reemplaza los alertas nativos invasivos)
// ==========================================================================

function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  } else {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }

  toast.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-msg">${escapeHtml(message)}</div>
    <button type="button" class="toast-close" aria-label="Cerrar">&times;</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.onclick = () => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => { if (toast.isConnected) toast.remove(); }, 200);
    };
  }

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.isConnected) {
      toast.classList.add('toast-fade-out');
      setTimeout(() => { if (toast.isConnected) toast.remove(); }, 250);
    }
  }, duration);
}

function showConfirmModal({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', isDanger = false, onConfirm }) {
  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('modal-title');
  const msgEl = document.getElementById('modal-message');
  const confirmBtn = document.getElementById('modal-btn-confirm');
  const cancelBtn = document.getElementById('modal-btn-cancel');
  const iconWrap = document.getElementById('modal-icon-wrap');

  if (!modal) {
    if (confirm(message)) {
      if (onConfirm) onConfirm();
    }
    return;
  }

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  if (confirmBtn) confirmBtn.textContent = confirmText;
  if (cancelBtn) cancelBtn.textContent = cancelText;

  if (confirmBtn) {
    confirmBtn.className = isDanger ? 'btn btn-sm btn-danger' : 'btn btn-sm btn-primary';
  }
  if (iconWrap) {
    iconWrap.className = isDanger ? 'modal-icon-wrap icon-danger' : 'modal-icon-wrap icon-primary';
  }

  const cleanup = () => {
    modal.classList.add('hidden');
    if (confirmBtn) confirmBtn.onclick = null;
    if (cancelBtn) cancelBtn.onclick = null;
    modal.onclick = null;
    document.removeEventListener('keydown', onKeyDown);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') cleanup();
  };

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      cleanup();
      if (onConfirm) onConfirm();
    };
  }

  if (cancelBtn) {
    cancelBtn.onclick = () => {
      cleanup();
    };
  }

  modal.onclick = (e) => {
    if (e.target === modal) cleanup();
  };

  document.addEventListener('keydown', onKeyDown);
  modal.classList.remove('hidden');
}

function showPdfProgressModal(total) {
  const modal = document.getElementById('pdf-progress-modal');
  if (!modal) return;
  const bar = document.getElementById('pdf-progress-bar');
  const txt = document.getElementById('pdf-progress-text');
  const status = document.getElementById('pdf-progress-status');
  if (bar) bar.style.width = '8%';
  if (txt) txt.textContent = `0 / ${total} hojas`;
  if (status) status.textContent = 'Iniciando generación de documento oficial...';
  modal.classList.remove('hidden');
}

function updatePdfProgress(current, total, statusText) {
  const bar = document.getElementById('pdf-progress-bar');
  const txt = document.getElementById('pdf-progress-text');
  const status = document.getElementById('pdf-progress-status');
  const pct = Math.round((current / total) * 100);
  if (bar) bar.style.width = `${pct}%`;
  if (txt) txt.textContent = `${current} / ${total} hojas (${pct}%)`;
  if (status && statusText) status.textContent = statusText;
}

function hidePdfProgressModal() {
  const modal = document.getElementById('pdf-progress-modal');
  if (modal) modal.classList.add('hidden');
}
