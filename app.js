/**
 * BEEFLOW Formulario de Auditoría de Servicio
 * Frontend Application & Official PDF Generator Engine
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
  zoomLevel: 'auto' // Default to auto-fit for 100% responsive viewing
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
  document.getElementById('meta-campo').value = state.metadata.campo || '';
  document.getElementById('meta-apicultor').value = state.metadata.apicultor || '';
  document.getElementById('meta-fecha').value = state.metadata.fecha || '';
  document.getElementById('meta-proyecto').value = state.metadata.proyecto || '';
  document.getElementById('meta-lote').value = state.metadata.lote || '';

  // Render UI
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
  state.metadata.campo = document.getElementById('meta-campo').value.trim();
  state.metadata.apicultor = document.getElementById('meta-apicultor').value.trim();
  state.metadata.fecha = document.getElementById('meta-fecha').value;
  state.metadata.proyecto = document.getElementById('meta-proyecto').value.trim();
  state.metadata.lote = document.getElementById('meta-lote').value.trim();

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
    formPanel.classList.remove('hidden');
    previewPanel.classList.add('hidden');
    tabForm.classList.add('active');
    tabPreview.classList.remove('active');
  } else {
    formPanel.classList.add('hidden');
    previewPanel.classList.remove('hidden');
    tabForm.classList.remove('active');
    tabPreview.classList.add('active');
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
  if (body.style.display === 'none') {
    body.style.display = 'block';
    txt.textContent = 'Ocultar Herramienta';
  } else {
    body.style.display = 'none';
    txt.textContent = 'Mostrar Herramienta';
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
  renderHivesTable();
  updateMetrics();
  renderOfficialSheets();
}

function removeHiveRow(index) {
  state.hives.splice(index, 1);
  saveDataToStorage();
  renderHivesTable();
  updateMetrics();
  renderOfficialSheets();
}

function updateHiveField(index, field, value) {
  if (!state.hives[index]) return;
  
  if (field === 'marcos') {
    // Only allow single digit or empty as specified by instructions (0-9 or 10)
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
  
  // If marked dead, adjust styling and optionally clear marcos
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
function generateBatchHives() {
  const prefix = document.getElementById('gen-prefix').value.trim() || 'C';
  const start = parseInt(document.getElementById('gen-start').value, 10) || 104;
  const count = parseInt(document.getElementById('gen-count').value, 10) || 40;
  const isMaxpoll = document.getElementById('gen-maxpoll').checked;
  const isTobee = document.getElementById('gen-tobee').checked;
  const isTorta = document.getElementById('gen-torta').checked;

  if (count <= 0) return alert('Por favor ingresa una cantidad válida de colmenas.');

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

  state.hives = newHives;
  saveDataToStorage();
  renderHivesTable();
  updateMetrics();
  renderOfficialSheets();

  alert(`Se generaron con éxito ${count} colmenas (${prefix}${start} a ${prefix}${start + count - 1}).`);
}

// Bulk toggle marks
function bulkSetMarks(field, val) {
  state.hives.forEach(h => {
    h[field] = val;
  });
  saveDataToStorage();
  renderHivesTable();
  updateMetrics();
  renderOfficialSheets();
}

// Clear all data
function clearAllData() {
  if (!confirm('¿Estás seguro de que deseas vaciar todas las colmenas registradas?')) return;
  state.hives = [];
  saveDataToStorage();
  renderHivesTable();
  updateMetrics();
  renderOfficialSheets();
}

// Load Official Sample Datasets from the PDF
function loadSampleData(sampleType, alertUser = true) {
  let sampleList = [];
  
  if (sampleType === 'page1') {
    // Exact clone of Page 1 in original PDF: C104 to C143 (40 colmenas)
    // Left: C104 to C123, Right: C124 to C143
    // Muerta: false, Maxpoll: true, Tobee: true, Torta P.: false
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
  } else if (sampleType === 'page2') {
    // Exact clone of Page 2 in original PDF: C144 to C183 (40 colmenas)
    // All checkboxes unchecked
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
  }

  state.hives = sampleList;
  saveDataToStorage();
  renderHivesTable();
  updateMetrics();
  renderOfficialSheets();

  if (alertUser) {
    alert(`Se cargó la plantilla con éxito (${sampleList.length} colmenas).`);
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

  const query = state.filterQuery;
  const filtered = state.hives.filter((h, idx) => {
    if (!query) return true;
    return h.id.toLowerCase().includes(query) || (idx + 1).toString() === query;
  });

  document.getElementById('badge-count').textContent = `${state.hives.length} registradas`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
          ${query ? 'No se encontraron colmenas con ese criterio.' : 'No hay colmenas registradas. Usa el generador de rango arriba o añade una fila.'}
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  filtered.forEach((hive, filterIdx) => {
    // Find real index in original array
    const realIndex = state.hives.indexOf(hive);
    const isDead = hive.muerta;

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
  const totalPages = Math.ceil(total / 40) || 1;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-avg-marcos').textContent = avg;
  document.getElementById('stat-muertas').textContent = muertas;
  document.getElementById('stat-pages').textContent = totalPages;
}

// ==========================================================================
// OFFICIAL BEEFLOW DOCUMENT RENDER ENGINE
// Clones 100% the exact visual layout from original PDF
// ==========================================================================
function renderOfficialSheets() {
  const previewStage = document.getElementById('print-preview-stage');
  const officialContainer = document.getElementById('official-document-container');
  if (!previewStage && !officialContainer) return;

  const totalHives = state.hives.length;
  const totalPages = Math.max(1, Math.ceil(totalHives / 40));

  let htmlSheets = '';

  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const pageIndex = pageNum + 1;
    const startIdx = pageNum * 40;
    
    // Left column: 20 hives
    const leftHives = state.hives.slice(startIdx, startIdx + 20);
    // Right column: 20 hives
    const rightHives = state.hives.slice(startIdx + 20, startIdx + 40);

    // Render left table rows (padded to exactly 20)
    const leftRowsHtml = buildColumnRowsHtml(leftHives, 20);
    // Render right table rows (padded to exactly 20)
    const rightRowsHtml = buildColumnRowsHtml(rightHives, 20);

    // Format display date
    const dateFormatted = formatDateForPrint(state.metadata.fecha);

    htmlSheets += `
      <div class="beeflow-sheet">
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

  // Populate preview stage and print container
  if (previewStage) {
    previewStage.innerHTML = htmlSheets;
    adjustPreviewZoom(state.zoomLevel);
  }
  if (officialContainer) {
    officialContainer.innerHTML = htmlSheets;
  }
}

// Generate rows for 1 table column (always exactly 20 rows to keep rigid A4 height)
function buildColumnRowsHtml(hivesArray, targetRows = 20) {
  let rowsHtml = '';

  for (let r = 0; r < targetRows; r++) {
    const hive = hivesArray[r];

    if (hive && hive.id) {
      // Real colmena entry
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
      // Empty row (matches Page 6 of original PDF where unused rows keep empty checkboxes)
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
    // DD/MM/YYYY
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
// EXPORT FUNCTIONS: DIRECT PDF & DATA FILES
// ==========================================================================

// Direct PDF Export using Per-Sheet exact mapping (GUARANTEES NO ROW OVERFLOW OR SPLITTING)
async function exportDirectPDF() {
  const container = document.getElementById('official-document-container');
  if (!container) return;

  const btn = document.getElementById('btn-export-pdf');
  const oldText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>Generando PDF...</span>`;
  }

  // Ensure latest sheets are generated
  renderOfficialSheets();

  const cleanCampo = (state.metadata.campo || 'Auditoria').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanFecha = (state.metadata.fecha || '2026').replace(/[^a-zA-Z0-9_-]/g, '-');
  const fileName = `BEEFLOW_Auditoria_${cleanCampo}_${cleanFecha}.pdf`;

  // Make container visible in isolated sandbox to capture at exact 297mm x 210mm
  container.style.display = 'block';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '297mm';
  container.style.zIndex = '-1000';

  const sheets = container.querySelectorAll('.beeflow-sheet');

  try {
    // Detect jsPDF class from html2pdf bundle or global scope
    const jsPdfClass = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (typeof jsPDF !== 'undefined' ? jsPDF : null);

    if (jsPdfClass && typeof html2canvas !== 'undefined') {
      // 100% PRECISE PER-SHEET COMPILATION (NO MULTI-PAGE SLICING BUG)
      const pdf = new jsPdfClass({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      for (let i = 0; i < sheets.length; i++) {
        if (i > 0) {
          pdf.addPage('a4', 'landscape');
        }
        const sheet = sheets[i];
        
        // Render each sheet to crisp canvas at 2x resolution
        const canvas = await html2canvas(sheet, {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollY: 0,
          scrollX: 0
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        // Place exact sheet at (0, 0) fitting 297mm x 210mm
        pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
      }

      pdf.save(fileName);
    } else if (typeof html2pdf !== 'undefined') {
      // Robust html2pdf fallback with strict avoidance
      const opt = {
        margin: [0, 0, 0, 0],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true },
        pagebreak: { mode: ['avoid-all', 'css'], avoid: '.beeflow-sheet' }
      };
      await html2pdf().set(opt).from(container).save();
    } else {
      window.print();
    }
  } catch (err) {
    console.error('Error generando PDF:', err);
    alert('Ocurrió un detalle técnico al exportar. Se abrirá la impresión directa en PDF de alta resolución.');
    window.print();
  } finally {
    container.style.display = 'none';
    container.style.position = '';
    container.style.left = '';
    container.style.top = '';
    container.style.width = '';
    container.style.zIndex = '';
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = oldText;
    }
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
      document.getElementById('meta-campo').value = state.metadata.campo || '';
      document.getElementById('meta-apicultor').value = state.metadata.apicultor || '';
      document.getElementById('meta-fecha').value = state.metadata.fecha || '';
      document.getElementById('meta-proyecto').value = state.metadata.proyecto || '';
      document.getElementById('meta-lote').value = state.metadata.lote || '';

      saveDataToStorage();
      renderHivesTable();
      updateMetrics();
      renderOfficialSheets();
      alert('Datos importados correctamente.');
    } catch (err) {
      alert('Error al leer el archivo JSON: ' + err.message);
    }
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
}
