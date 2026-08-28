/* ==========================================================================
   CONFIGURACIÓN — edita estos datos con la información real de tu equipo
   ========================================================================== */
const CONFIG = {
  // Correo donde deben llegar las solicitudes de cotización.
  quoteEmail: "mercadeo@ip7.com.co",
};

// Cantidad mínima por defecto, solo se usa si un producto no trae su propio
// campo `minQty` en products.js.
const DEFAULT_MIN_QTY = 5;

// Ejecutivos comerciales — se muestran dentro del formulario de cotización
// (por correo) para que el cliente elija a quién dirigir su solicitud.
const EXECUTIVES = [
  { name: "Yanira Silva", email: "ejecutivo.comercial8@ip7.com.co" },
  { name: "Margarita Salinas", email: "margaritasalinas@ip7.com.co" },
  { name: "Elizabeth Leon", email: "ejecutivo.comercial5@ip7.com.co" },
  { name: "Sevastian Velosa", email: "ejecutivo.comercial3@ip7.com.co" },
  { name: "Daniel Alvarez", email: "ejecutivo.comercial4@ip7.com.co" },
  { name: "Servicio al cliente", email: "servicioalcliente@ip7.com.co", general: true },
];

// Ejecutivos comerciales por WhatsApp — se muestran en los botones "Hablar
// con un ejecutivo" / "Contactar a mi ejecutivo" para una respuesta rápida.
// Teléfono en formato internacional, solo dígitos (57 + celular, sin +).
const WHATSAPP_EXECUTIVES = [
  { name: "Yanira Silva", phone: "573001715354" },
  { name: "Elizabeth Leon", phone: "573006015812" },
  { name: "Sevastian Velosa", phone: "573001715355" },
  { name: "Daniel Alvarez", phone: "573001715339" },
  { name: "Servicio al cliente", phone: "573008181464", general: true },
];

/* ==========================================================================
   ENVÍO DE LA SOLICITUD DE COTIZACIÓN
   --------------------------------------------------------------------------
   Esta página no depende de un backend: hoy arma el mensaje y lo entrega
   por correo (mailto) o portapapeles.
   Para conectar un envío automático (sin depender del cliente de correo del
   usuario), reemplaza el cuerpo de esta función por una llamada a tu propio
   servicio, por ejemplo con EmailJS, Formspree o una función serverless:

   async function sendQuoteRequest(payload) {
     await fetch("https://TU-ENDPOINT/api/cotizaciones", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(payload),
     });
   }

   `payload` ya viene armado como { nombre, empresa, correo, telefono, ciudad,
   comentarios, productos: [{nombre, codigo, cantidad}], mensaje } listo para
   enviar tal cual a la API que elijas.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  /* ---------------------------------------------------------------------
     ESTADO: carrito de selección (persistido en localStorage)
     --------------------------------------------------------------------- */
  const CART_KEY = "ip7_automotriz_cart";
  let cart = loadCart();

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }
  function productById(id) {
    return PRODUCTS.find((p) => p.id === id);
  }
  function minQtyOf(product) {
    return product && product.minQty ? product.minQty : DEFAULT_MIN_QTY;
  }
  function cartCount() {
    return Object.keys(cart).length;
  }

  /* ---------------------------------------------------------------------
     RENDER DEL CATÁLOGO
     --------------------------------------------------------------------- */
  const catalogSections = document.getElementById("catalogSections");
  const cardTemplate = document.getElementById("cardTemplate");

  function buildCard(product) {
    const node = cardTemplate.content.cloneNode(true);
    const article = node.querySelector(".card");
    article.dataset.id = product.id;
    article.dataset.category = product.category;
    article.dataset.search = (product.name + " " + product.description + " " + product.code).toLowerCase();

    const images = product.images && product.images.length ? product.images : [product.image];
    const media = node.querySelector(".card-media");
    const img = media.querySelector("img");
    const prevBtn = media.querySelector(".gallery-prev");
    const nextBtn = media.querySelector(".gallery-next");
    const dotsWrap = media.querySelector(".gallery-dots");
    let activeIndex = 0;

    img.alt = product.name;
    img.onerror = () => {
      media.style.background = "linear-gradient(135deg, var(--surface-3), var(--surface))";
    };

    function renderImage() {
      img.src = images[activeIndex];
      dotsWrap.querySelectorAll("button").forEach((d, i) => d.classList.toggle("is-active", i === activeIndex));
    }

    if (images.length > 1) {
      media.classList.add("has-gallery");
      images.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Ver foto ${i + 1}`);
        dot.addEventListener("click", (e) => {
          e.stopPropagation();
          activeIndex = i;
          renderImage();
        });
        dotsWrap.appendChild(dot);
      });
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        activeIndex = (activeIndex - 1 + images.length) % images.length;
        renderImage();
      });
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        activeIndex = (activeIndex + 1) % images.length;
        renderImage();
      });

      let touchStartX = null;
      media.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
      media.addEventListener("touchend", (e) => {
        if (touchStartX === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(delta) > 40) {
          activeIndex = delta < 0
            ? (activeIndex + 1) % images.length
            : (activeIndex - 1 + images.length) % images.length;
          renderImage();
        }
        touchStartX = null;
      });
    } else {
      prevBtn.remove();
      nextBtn.remove();
    }

    renderImage();

    node.querySelector(".card-code").textContent = product.code;
    node.querySelector(".card-title").textContent = product.name;
    node.querySelector(".card-desc").textContent = product.description;

    const featuresEl = node.querySelector(".card-features");
    product.features.forEach((f) => {
      const li = document.createElement("li");
      li.textContent = f;
      featuresEl.appendChild(li);
    });

    const qtyInput = node.querySelector(".qty-input");
    const minusBtn = node.querySelector(".qty-minus");
    const plusBtn = node.querySelector(".qty-plus");
    const minQty = minQtyOf(product);

    function clampQty(v) {
      v = parseInt(v, 10);
      if (isNaN(v) || v < minQty) v = minQty;
      if (v > 50000) v = 50000;
      return v;
    }
    qtyInput.min = minQty;
    qtyInput.value = minQty;
    minusBtn.addEventListener("click", () => {
      const next = clampQty(qtyInput.value) - 1;
      qtyInput.value = next < minQty ? minQty : next;
    });
    plusBtn.addEventListener("click", () => {
      qtyInput.value = clampQty(qtyInput.value) + 1;
    });
    qtyInput.addEventListener("change", () => {
      qtyInput.value = clampQty(qtyInput.value);
    });

    const presetsWrap = node.querySelector(".qty-presets");
    presetsWrap.innerHTML = "";
    [1, 2, 5, 10].forEach((mult) => {
      const qty = Math.min(minQty * mult, 50000);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.qty = qty;
      btn.textContent = qty.toLocaleString("es-CO");
      btn.addEventListener("click", () => {
        qtyInput.value = clampQty(btn.dataset.qty);
      });
      presetsWrap.appendChild(btn);
    });

    const addBtn = node.querySelector(".card-add");
    addBtn.addEventListener("click", () => {
      const qty = clampQty(qtyInput.value);
      cart[product.id] = qty;
      saveCart();
      renderCartUI();
      addBtn.textContent = "✓ Agregado al carrito";
      addBtn.classList.add("is-added");
      showToast(`${product.name} agregado al carrito (${qty.toLocaleString("es-CO")} und.)`);
      setTimeout(() => {
        addBtn.textContent = "Agregar al carrito";
        addBtn.classList.remove("is-added");
      }, 1800);
    });

    return node;
  }

  function renderCatalog() {
    catalogSections.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const products = PRODUCTS.filter((p) => p.category === cat.slug);
      if (!products.length) return;

      const section = document.createElement("section");
      section.className = "category-block";
      section.id = "cat-" + cat.slug;
      section.dataset.category = cat.slug;

      section.innerHTML = `
        <div class="category-block-head">
          <h3>${cat.label}</h3>
          <span class="category-count">${products.length} producto${products.length !== 1 ? "s" : ""}</span>
        </div>
        <div class="grid"></div>
      `;

      const grid = section.querySelector(".grid");
      products.forEach((p) => grid.appendChild(buildCard(p)));

      catalogSections.appendChild(section);
    });

    observeCards();
  }

  /* ---------------------------------------------------------------------
     FILTROS + BÚSQUEDA
     --------------------------------------------------------------------- */
  const searchInput = document.getElementById("searchInput");
  const filterPills = document.querySelectorAll(".pill");
  const noResults = document.getElementById("noResults");
  let activeFilter = "todos";

  function normalize(str) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  function applyFilters() {
    const query = normalize(searchInput.value.trim());
    let visibleCount = 0;

    document.querySelectorAll(".category-block").forEach((section) => {
      const cat = section.dataset.category;
      let sectionVisible = 0;

      section.querySelectorAll(".card").forEach((card) => {
        const matchesCategory = activeFilter === "todos" || card.dataset.category === activeFilter;
        const matchesQuery = !query || normalize(card.dataset.search).includes(query);
        const show = matchesCategory && matchesQuery;
        card.style.display = show ? "" : "none";
        if (show) sectionVisible++;
      });

      section.style.display = sectionVisible ? "" : "none";
      section.querySelector(".category-count").textContent =
        sectionVisible + " producto" + (sectionVisible !== 1 ? "s" : "");
      visibleCount += sectionVisible;
    });

    noResults.hidden = visibleCount !== 0;
  }

  searchInput.addEventListener("input", applyFilters);

  filterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      filterPills.forEach((p) => p.classList.remove("is-active"));
      pill.classList.add("is-active");
      activeFilter = pill.dataset.filter;
      applyFilters();
      if (activeFilter !== "todos") {
        const target = document.getElementById("cat-" + activeFilter);
        if (target) {
          setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
        }
      }
    });
  });

  document.getElementById("clearFilters").addEventListener("click", () => {
    searchInput.value = "";
    filterPills.forEach((p) => p.classList.remove("is-active"));
    document.querySelector('.pill[data-filter="todos"]').classList.add("is-active");
    activeFilter = "todos";
    applyFilters();
  });

  /* ---------------------------------------------------------------------
     CARRITO — UI (chip, fab, barra móvil, drawer)
     --------------------------------------------------------------------- */
  const cartChipText = document.getElementById("cartChipText");
  const cartFabCount = document.getElementById("cartFabCount");
  const mobileCartBadge = document.getElementById("mobileCartBadge");
  const drawerList = document.getElementById("drawerList");
  const drawerEmpty = document.getElementById("drawerEmpty");
  const goToQuoteBtn = document.getElementById("goToQuoteBtn");

  function renderCartUI() {
    const count = cartCount();
    cartChipText.textContent = `${count} producto${count !== 1 ? "s" : ""} seleccionado${count !== 1 ? "s" : ""}`;
    cartFabCount.textContent = count;
    mobileCartBadge.textContent = count;
    mobileCartBadge.hidden = count === 0;
    goToQuoteBtn.disabled = count === 0;

    drawerList.innerHTML = "";
    const ids = Object.keys(cart);
    drawerEmpty.style.display = ids.length ? "none" : "block";

    ids.forEach((id) => {
      const product = productById(id);
      if (!product) return;
      const itemMinQty = minQtyOf(product);
      const li = document.createElement("li");
      li.className = "drawer-item";
      li.innerHTML = `
        <img src="${product.images[0]}" alt="${product.name}">
        <div class="drawer-item-info">
          <h5>${product.name}</h5>
          <span>${product.code}</span>
          <div class="drawer-item-controls">
            <input type="number" min="${itemMinQty}" max="50000" value="${cart[id]}" data-id="${id}">
            <button type="button" class="drawer-item-remove" data-id="${id}">Quitar</button>
          </div>
        </div>
      `;
      drawerList.appendChild(li);
    });

    drawerList.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => {
        const itemMinQty = minQtyOf(productById(input.dataset.id));
        let v = parseInt(input.value, 10);
        if (isNaN(v) || v < itemMinQty) v = itemMinQty;
        if (v > 50000) v = 50000;
        input.value = v;
        cart[input.dataset.id] = v;
        saveCart();
      });
    });
    drawerList.querySelectorAll(".drawer-item-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        delete cart[btn.dataset.id];
        saveCart();
        renderCartUI();
      });
    });

    renderQuoteSummary();
  }

  /* ---------------------------------------------------------------------
     PANELES: drawer / modales
     --------------------------------------------------------------------- */
  const backdrop = document.getElementById("backdrop");
  const cartDrawer = document.getElementById("cartDrawer");
  const quoteModal = document.getElementById("quoteModal");
  const whatsappModal = document.getElementById("whatsappModal");

  function openPanel(panel) {
    closeAllPanels();
    backdrop.classList.add("is-visible");
    panel.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeAllPanels() {
    backdrop.classList.remove("is-visible");
    cartDrawer.classList.remove("is-open");
    quoteModal.classList.remove("is-open");
    whatsappModal.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".js-open-drawer").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openPanel(cartDrawer);
    })
  );
  document.querySelectorAll(".js-open-whatsapp").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openPanel(whatsappModal);
    })
  );
  document.querySelectorAll(".js-close-panels").forEach((el) =>
    el.addEventListener("click", () => closeAllPanels())
  );
  backdrop.addEventListener("click", closeAllPanels);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllPanels();
  });

  document.getElementById("goToQuoteBtn").addEventListener("click", () => {
    openPanel(quoteModal);
  });

  /* ---------------------------------------------------------------------
     SELECTOR DE COMERCIAL DENTRO DEL FORMULARIO DE COTIZACIÓN
     --------------------------------------------------------------------- */
  const executivoSelect = document.getElementById("executivoSelect");
  EXECUTIVES.forEach((exec) => {
    const opt = document.createElement("option");
    opt.value = exec.email;
    opt.textContent = exec.general ? `${exec.name} (opción general)` : exec.name;
    executivoSelect.appendChild(opt);
  });
  function selectedExecutive() {
    return EXECUTIVES.find((e) => e.email === executivoSelect.value) || null;
  }

  /* ---------------------------------------------------------------------
     LISTA DE EJECUTIVOS POR WHATSAPP (botones "Hablar con un ejecutivo")
     --------------------------------------------------------------------- */
  const whatsappExecutivesList = document.getElementById("whatsappExecutivesList");
  const whatsappGreeting = "Hola, vengo del catálogo automotriz y quisiera asesoría.";
  WHATSAPP_EXECUTIVES.forEach((exec) => {
    const a = document.createElement("a");
    a.className = "contact-option" + (exec.general ? " contact-option-general" : "");
    a.href = `https://wa.me/${exec.phone}?text=${encodeURIComponent(whatsappGreeting)}`;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = `
      <span class="co-icon">${exec.general ? "🎧" : "💬"}</span>
      <span><strong>${exec.name}</strong><small>${exec.general ? "Opción general" : "Comercial"} · WhatsApp</small></span>
    `;
    whatsappExecutivesList.appendChild(a);
  });

  /* ---------------------------------------------------------------------
     RESUMEN DE COTIZACIÓN + ENVÍO
     --------------------------------------------------------------------- */
  const quoteSummaryList = document.getElementById("quoteSummaryList");

  function renderQuoteSummary() {
    quoteSummaryList.innerHTML = "";
    const ids = Object.keys(cart);
    if (!ids.length) {
      quoteSummaryList.innerHTML = '<li class="quote-summary-empty">Aún no has seleccionado productos.</li>';
      return;
    }
    ids.forEach((id) => {
      const product = productById(id);
      if (!product) return;
      const li = document.createElement("li");
      li.innerHTML = `<span>${product.name} <em style="color:var(--text-faint); font-style:normal;">(${product.code})</em></span><span>${cart[id].toLocaleString("es-CO")} und.</span>`;
      quoteSummaryList.appendChild(li);
    });
  }

  function buildQuotePayload(formData) {
    const productos = Object.keys(cart)
      .map((id) => {
        const p = productById(id);
        return p ? { nombre: p.name, codigo: p.code, cantidad: cart[id] } : null;
      })
      .filter(Boolean);

    const lineasProductos = productos
      .map((p) => `• ${p.nombre} (${p.codigo}) — ${p.cantidad.toLocaleString("es-CO")} und.`)
      .join("\n");

    const exec = selectedExecutive();

    const mensaje =
      `Solicitud de cotización — Catálogo Automotriz\n\n` +
      `Comercial: ${exec ? exec.name : "-"}\n\n` +
      `Nombre: ${formData.nombre}\n` +
      `Empresa: ${formData.empresa}\n` +
      `Correo: ${formData.correo}\n` +
      `Teléfono: ${formData.telefono}\n` +
      `Ciudad: ${formData.ciudad || "-"}\n\n` +
      `Productos:\n${lineasProductos || "(sin productos seleccionados)"}\n\n` +
      `Comentarios: ${formData.comentarios || "-"}`;

    return { ...formData, productos, exec, mensaje };
  }

  function getFormData() {
    const form = document.getElementById("quoteForm");
    const fd = new FormData(form);
    return {
      nombre: fd.get("nombre") || "",
      empresa: fd.get("empresa") || "",
      correo: fd.get("correo") || "",
      telefono: fd.get("telefono") || "",
      ciudad: fd.get("ciudad") || "",
      comentarios: fd.get("comentarios") || "",
    };
  }

  function validateForm() {
    const form = document.getElementById("quoteForm");
    if (!form.reportValidity()) return false;
    if (cartCount() === 0) {
      showToast("Selecciona al menos un producto antes de enviar tu solicitud.");
      return false;
    }
    return true;
  }

  const quoteForm = document.getElementById("quoteForm");
  quoteForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const payload = buildQuotePayload(getFormData());
    // sendQuoteRequest(payload); // <- conecta aquí tu backend/API cuando esté listo
    const subject = encodeURIComponent("Solicitud de cotización — Catálogo Automotriz");
    const body = encodeURIComponent(payload.mensaje);
    const to = payload.exec ? payload.exec.email : CONFIG.quoteEmail;
    window.location.href = `mailto:${to}?cc=${CONFIG.quoteEmail}&subject=${subject}&body=${body}`;
    showToast(`Abriendo tu cliente de correo para enviar la solicitud a ${payload.exec ? payload.exec.name : "el equipo comercial"}…`);
  });

  document.getElementById("copyRequestBtn").addEventListener("click", async () => {
    if (!validateForm()) return;
    const payload = buildQuotePayload(getFormData());
    try {
      await navigator.clipboard.writeText(payload.mensaje);
      showToast("Solicitud copiada. Puedes pegarla donde prefieras enviarla.");
    } catch (e) {
      showToast("No se pudo copiar automáticamente. Selecciona el texto manualmente.");
    }
  });

  /* ---------------------------------------------------------------------
     TOAST
     --------------------------------------------------------------------- */
  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  /* ---------------------------------------------------------------------
     MODO DÍA / NOCHE
     --------------------------------------------------------------------- */
  const THEME_KEY = "ip7_theme";
  const themeToggle = document.getElementById("themeToggle");
  const themeToggleIcon = document.getElementById("themeToggleIcon");
  const themeToggleText = document.getElementById("themeToggleText");
  const headlightFlash = document.getElementById("headlightFlash");

  const ICON_MOON =
    '<svg viewBox="0 0 24 24" fill="none"><path d="M20.5 14.5a8.5 8.5 0 1 1-9-13 7 7 0 0 0 9 13Z" fill="currentColor"/></svg>';
  const ICON_SUN =
    '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><g stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2.5v2.4M12 19.1v2.4M21.5 12h-2.4M4.9 12H2.5M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6"/></g></svg>';

  function applyTheme(theme, { flash = false } = {}) {
    // Evita que las transiciones de color queden "atascadas" al cambiar de tema.
    document.documentElement.classList.add("theme-switching");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => document.documentElement.classList.remove("theme-switching"));
    });

    const heroCarImg = document.getElementById("heroCarImg");
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
      themeToggleIcon.innerHTML = ICON_SUN;
      themeToggleText.textContent = "Ver de noche";
      themeToggle.setAttribute("aria-label", "Cambiar a modo noche");
      if (heroCarImg) heroCarImg.src = "assets/img/brand/hero-car-day.jpg";
    } else {
      document.documentElement.removeAttribute("data-theme");
      themeToggleIcon.innerHTML = ICON_MOON;
      themeToggleText.textContent = "Ver de día";
      themeToggle.setAttribute("aria-label", "Cambiar a modo día");
      if (heroCarImg) heroCarImg.src = "assets/img/brand/hero-car-night.jpg";
    }
    if (heroCarImg) heroCarImg.onerror = () => { heroCarImg.onerror = null; heroCarImg.src = "assets/img/brand/hero-car.jpg"; };
    if (flash && theme === "light") {
      headlightFlash.classList.remove("is-flashing");
      // eslint-disable-next-line no-unused-expressions
      headlightFlash.offsetWidth; // reinicia la animación
      headlightFlash.classList.add("is-flashing");
    }
  }

  applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

  themeToggle.addEventListener("click", () => {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    const next = isLight ? "dark" : "light";
    applyTheme(next, { flash: true });
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  });

  /* ---------------------------------------------------------------------
     NAV MÓVIL
     --------------------------------------------------------------------- */
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");
  hamburger.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    hamburger.classList.toggle("is-open", isOpen);
    hamburger.setAttribute("aria-expanded", isOpen);
  });
  navLinks.querySelectorAll("[data-close]").forEach((a) =>
    a.addEventListener("click", () => {
      navLinks.classList.remove("is-open");
      hamburger.classList.remove("is-open");
    })
  );

  /* ---------------------------------------------------------------------
     SCROLL REVEAL PARA LAS TARJETAS
     --------------------------------------------------------------------- */
  let cardObserver;
  function observeCards() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".card").forEach((c) => c.classList.add("in-view"));
      return;
    }
    if (cardObserver) cardObserver.disconnect();
    cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            cardObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".card:not(.in-view)").forEach((c) => cardObserver.observe(c));
  }

  /* ---------------------------------------------------------------------
     CURSOR DECORATIVO (anillo azul que sigue el mouse — solo desktop)
     --------------------------------------------------------------------- */
  const cursorRing = document.getElementById("cursor-ring");
  const cursorDot = document.getElementById("cursor-dot");
  const finePointer = window.matchMedia("(hover:hover) and (pointer:fine)").matches;

  if (finePointer && cursorRing && cursorDot) {
    let mouseX = -100,
      mouseY = -100;
    let ringX = -100,
      ringY = -100;

    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%,-50%)`;
    });

    function animateRing() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%,-50%)`;
      requestAnimationFrame(animateRing);
    }
    animateRing();

    const hoverSelector = 'a, button, .card, input, .pill, [role="button"]';
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(hoverSelector)) cursorRing.classList.add("is-hover");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(hoverSelector)) cursorRing.classList.remove("is-hover");
    });
  }

  /* ---------------------------------------------------------------------
     INIT
     --------------------------------------------------------------------- */
  renderCatalog();
  renderCartUI();
  applyFilters();
});
