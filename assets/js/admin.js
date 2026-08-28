/* ==========================================================================
   EDITOR DE FOTOS DEL CATÁLOGO
   --------------------------------------------------------------------------
   Herramienta interna (no forma parte del catálogo público) para reemplazar
   las fotos de producto directamente desde el navegador.

   - En Chrome / Edge de escritorio: al conectar la carpeta
     assets/img/productos, "Guardar en la carpeta" escribe el archivo ahí
     mismo, con el nombre exacto que ya usa products.js. Solo hay que
     recargar el catálogo para ver el cambio.
   - En cualquier otro navegador (o si no conectas la carpeta): usa
     "Descargar imagen", que genera el archivo con el nombre correcto listo
     para arrastrar a assets/img/productos/.
   ========================================================================== */

const EXPORT_SIZE = 1200; // px de salida (cuadrado)
const DISPLAY_SIZE = 500; // px del lienzo en pantalla

document.addEventListener("DOMContentLoaded", () => {
  /* ---------------------------------------------------------------------
     PERSISTENCIA DEL PERMISO DE CARPETA (IndexedDB)
     --------------------------------------------------------------------- */
  function idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("ip7_admin", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("kv");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbGet(key) {
    try {
      const db = await idbOpen();
      return await new Promise((resolve) => {
        const r = db.transaction("kv", "readonly").objectStore("kv").get(key);
        r.onsuccess = () => resolve(r.result || null);
        r.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }
  async function idbSet(key, val) {
    try {
      const db = await idbOpen();
      return await new Promise((resolve) => {
        const tx = db.transaction("kv", "readwrite");
        tx.objectStore("kv").put(val, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }

  const SUPPORTS_FS_API = "showDirectoryPicker" in window;
  let dirHandle = null;

  const folderStatus = document.getElementById("folderStatus");
  const connectFolderBtn = document.getElementById("connectFolderBtn");

  function updateFolderStatus() {
    if (dirHandle) {
      folderStatus.textContent = `📁 Carpeta conectada: "${dirHandle.name}" — al guardar, la foto se reemplaza automáticamente.`;
      connectFolderBtn.textContent = "📁 Cambiar carpeta";
    } else if (!SUPPORTS_FS_API) {
      folderStatus.textContent =
        "Tu navegador no permite guardar directamente en la carpeta (usa Chrome o Edge en computador para esa función). Puedes seguir editando y usar \"Descargar imagen\".";
      connectFolderBtn.hidden = true;
    } else {
      folderStatus.textContent =
        "Carpeta no conectada — puedes editar y descargar las fotos igual, solo tendrás que arrastrarlas tú mismo a la carpeta.";
      connectFolderBtn.textContent = "📁 Conectar carpeta de imágenes";
    }
  }

  async function restoreFolderHandle() {
    if (!SUPPORTS_FS_API) {
      updateFolderStatus();
      return;
    }
    const saved = await idbGet("productosDir");
    if (saved) {
      try {
        const perm = await saved.queryPermission({ mode: "readwrite" });
        if (perm === "granted") {
          dirHandle = saved;
        }
      } catch (e) {
        /* handle inválido o de otro origen, se ignora */
      }
    }
    updateFolderStatus();
  }

  async function connectFolder() {
    if (!SUPPORTS_FS_API) return false;
    try {
      const handle = await window.showDirectoryPicker({ id: "ip7-productos", mode: "readwrite" });
      dirHandle = handle;
      await idbSet("productosDir", handle);
      updateFolderStatus();
      return true;
    } catch (e) {
      return false; // el usuario canceló el diálogo
    }
  }

  connectFolderBtn.addEventListener("click", connectFolder);

  async function ensureFolderPermission() {
    if (!dirHandle) return await connectFolder();
    const perm = await dirHandle.queryPermission({ mode: "readwrite" });
    if (perm === "granted") return true;
    const req = await dirHandle.requestPermission({ mode: "readwrite" });
    return req === "granted";
  }

  /* ---------------------------------------------------------------------
     GRID DE PRODUCTOS
     --------------------------------------------------------------------- */
  const adminSections = document.getElementById("adminSections");
  const adminSearch = document.getElementById("adminSearch");

  function filenameFromPath(path) {
    return path.split("/").pop();
  }

  function renderGrid() {
    adminSections.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const products = PRODUCTS.filter((p) => p.category === cat.slug);
      if (!products.length) return;

      const section = document.createElement("section");
      section.className = "admin-category";
      section.innerHTML = `<h2>${cat.label}</h2><div class="admin-grid"></div>`;
      const grid = section.querySelector(".admin-grid");

      products.forEach((product) => {
        product.images.forEach((imgPath, i) => {
          const slot = document.createElement("div");
          slot.className = "admin-slot";
          slot.dataset.search = (product.name + " " + product.code).toLowerCase();
          const label = product.images.length > 1 ? `${product.name} — Foto ${i + 1}` : product.name;
          slot.innerHTML = `
            <div class="admin-slot-media"><img src="${imgPath}" alt="${label}" loading="lazy"></div>
            <div class="admin-slot-info">
              <h5>${label}</h5>
              <span>${filenameFromPath(imgPath)}</span>
            </div>
          `;
          slot.addEventListener("click", () => openEditor(product, imgPath, label));
          grid.appendChild(slot);
        });
      });

      adminSections.appendChild(section);
    });
  }

  adminSearch.addEventListener("input", () => {
    const q = adminSearch.value.trim().toLowerCase();
    document.querySelectorAll(".admin-slot").forEach((slot) => {
      slot.classList.toggle("admin-slot-hidden", q !== "" && !slot.dataset.search.includes(q));
    });
    document.querySelectorAll(".admin-category").forEach((section) => {
      const anyVisible = [...section.querySelectorAll(".admin-slot")].some((s) => !s.classList.contains("admin-slot-hidden"));
      section.style.display = anyVisible ? "" : "none";
    });
  });

  /* ---------------------------------------------------------------------
     EDITOR (recorte cuadrado con arrastrar + zoom)
     --------------------------------------------------------------------- */
  const editorModal = document.getElementById("editorModal");
  const editorBackdrop = document.getElementById("editorBackdrop");
  const editorClose = document.getElementById("editorClose");
  const editorProductLabel = document.getElementById("editorProductLabel");
  const editorFileName = document.getElementById("editorFileName");
  const editorStage = document.getElementById("editorStage");
  const editorDropzone = document.getElementById("editorDropzone");
  const editorFileInput = document.getElementById("editorFileInput");
  const editorEmptyHint = document.getElementById("editorEmptyHint");
  const editorCanvas = document.getElementById("editorCanvas");
  const editorControls = document.getElementById("editorControls");
  const editorZoom = document.getElementById("editorZoom");
  const editorChangePhoto = document.getElementById("editorChangePhoto");
  const editorSaveFolder = document.getElementById("editorSaveFolder");
  const editorDownload = document.getElementById("editorDownload");
  const editorSaveHint = document.getElementById("editorSaveHint");

  const ctx = editorCanvas.getContext("2d");

  let currentTargetPath = null;
  let currentSlotEl = null;
  let sourceImage = null;
  let baseScale = 1;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;
  let dragStart = null;

  function openEditor(product, imgPath, label) {
    currentTargetPath = imgPath;
    currentSlotEl = [...document.querySelectorAll(".admin-slot")].find((s) => s.dataset.search === (product.name + " " + product.code).toLowerCase() && s.querySelector("span").textContent === filenameFromPath(imgPath));
    editorProductLabel.textContent = label;
    editorFileName.textContent = filenameFromPath(imgPath);
    resetEditorImage();
    editorSaveHint.textContent = dirHandle
      ? "Se guardará directamente en la carpeta conectada."
      : SUPPORTS_FS_API
      ? "Conecta la carpeta desde el botón de arriba para guardar directo, o descarga la imagen."
      : "Tu navegador no soporta guardar directo: usa \"Descargar imagen\".";
    editorModal.classList.add("is-open");
    editorBackdrop.classList.add("is-visible");
    document.body.style.overflow = "hidden";
  }

  function closeEditor() {
    editorModal.classList.remove("is-open");
    editorBackdrop.classList.remove("is-visible");
    document.body.style.overflow = "";
  }
  editorClose.addEventListener("click", closeEditor);
  editorBackdrop.addEventListener("click", closeEditor);

  function resetEditorImage() {
    sourceImage = null;
    editorStage.classList.remove("has-image");
    editorEmptyHint.hidden = false;
    editorControls.hidden = true;
    editorSaveFolder.disabled = true;
    editorDownload.disabled = true;
    ctx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
  }

  editorDropzone.addEventListener("click", () => {
    if (!sourceImage) editorFileInput.click();
  });
  editorChangePhoto.addEventListener("click", (e) => {
    e.stopPropagation();
    editorFileInput.click();
  });
  editorFileInput.addEventListener("change", () => {
    const file = editorFileInput.files[0];
    if (file) loadImageFile(file);
  });
  ["dragover", "dragenter"].forEach((evt) =>
    editorDropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      editorDropzone.style.borderColor = "var(--blue-light)";
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    editorDropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      editorDropzone.style.borderColor = "";
    })
  );
  editorDropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) loadImageFile(file);
  });

  function loadImageFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      sourceImage = img;
      editorStage.classList.add("has-image");
      editorEmptyHint.hidden = true;
      editorControls.hidden = false;
      editorSaveFolder.disabled = false;
      editorDownload.disabled = false;
      baseScale = Math.max(DISPLAY_SIZE / img.width, DISPLAY_SIZE / img.height);
      scale = baseScale;
      offsetX = (DISPLAY_SIZE - img.width * scale) / 2;
      offsetY = (DISPLAY_SIZE - img.height * scale) / 2;
      editorZoom.value = 100;
      drawCanvas();
    };
    img.src = url;
  }

  function clampOffsets() {
    const dw = sourceImage.width * scale;
    const dh = sourceImage.height * scale;
    offsetX = Math.min(0, Math.max(DISPLAY_SIZE - dw, offsetX));
    offsetY = Math.min(0, Math.max(DISPLAY_SIZE - dh, offsetY));
  }

  function drawCanvas() {
    if (!sourceImage) return;
    ctx.clearRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
    ctx.drawImage(sourceImage, offsetX, offsetY, sourceImage.width * scale, sourceImage.height * scale);
  }

  editorZoom.addEventListener("input", () => {
    if (!sourceImage) return;
    const centerX = DISPLAY_SIZE / 2 - offsetX;
    const centerY = DISPLAY_SIZE / 2 - offsetY;
    const ratio = centerX / (sourceImage.width * scale);
    const ratioY = centerY / (sourceImage.height * scale);
    scale = baseScale * (editorZoom.value / 100);
    offsetX = DISPLAY_SIZE / 2 - ratio * sourceImage.width * scale;
    offsetY = DISPLAY_SIZE / 2 - ratioY * sourceImage.height * scale;
    clampOffsets();
    drawCanvas();
  });

  function pointerPos(e) {
    const rect = editorCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * DISPLAY_SIZE,
      y: ((clientY - rect.top) / rect.height) * DISPLAY_SIZE,
    };
  }
  editorCanvas.addEventListener("pointerdown", (e) => {
    if (!sourceImage) return;
    dragging = true;
    editorCanvas.setPointerCapture(e.pointerId);
    const p = pointerPos(e);
    dragStart = { x: p.x, y: p.y, offsetX, offsetY };
  });
  editorCanvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const p = pointerPos(e);
    offsetX = dragStart.offsetX + (p.x - dragStart.x);
    offsetY = dragStart.offsetY + (p.y - dragStart.y);
    clampOffsets();
    drawCanvas();
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((evt) =>
    editorCanvas.addEventListener(evt, () => {
      dragging = false;
    })
  );

  function exportBlob() {
    return new Promise((resolve) => {
      const out = document.createElement("canvas");
      out.width = EXPORT_SIZE;
      out.height = EXPORT_SIZE;
      const octx = out.getContext("2d");
      const ratio = EXPORT_SIZE / DISPLAY_SIZE;
      octx.drawImage(
        sourceImage,
        offsetX * ratio,
        offsetY * ratio,
        sourceImage.width * scale * ratio,
        sourceImage.height * scale * ratio
      );
      out.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    });
  }

  editorDownload.addEventListener("click", async () => {
    if (!sourceImage) return;
    const blob = await exportBlob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filenameFromPath(currentTargetPath);
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast("Imagen descargada. Arrástrala a assets/img/productos/.");
  });

  editorSaveFolder.addEventListener("click", async () => {
    if (!sourceImage) return;
    const ok = await ensureFolderPermission();
    if (!ok) {
      showToast("No se pudo conectar la carpeta. Prueba \"Descargar imagen\".");
      return;
    }
    try {
      const blob = await exportBlob();
      const filename = filenameFromPath(currentTargetPath);
      const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      const newUrl = URL.createObjectURL(blob);
      if (currentSlotEl) currentSlotEl.querySelector("img").src = newUrl;
      updateFolderStatus();
      showToast(`Guardado: ${filename}. Recarga el catálogo para verlo.`);
      closeEditor();
    } catch (e) {
      showToast("No se pudo guardar en la carpeta: " + e.message);
    }
  });

  /* ---------------------------------------------------------------------
     TOAST
     --------------------------------------------------------------------- */
  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById("adminToast");
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  /* ---------------------------------------------------------------------
     INIT
     --------------------------------------------------------------------- */
  renderGrid();
  restoreFolderHandle();
});
