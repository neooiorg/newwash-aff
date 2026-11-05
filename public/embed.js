(() => {
  var script = document.currentScript;
  if (!script || !script.src || document.getElementById("newwash-popup-root")) return;

  var origin = new URL(script.src).origin;
  var params = new URLSearchParams(location.search);
  var incomingCode = params.get("aff") || script.getAttribute("data-aff") || "";
  var storedCode = "";
  try {
    if (incomingCode) sessionStorage.setItem("newwash-aff-code", incomingCode);
    storedCode = sessionStorage.getItem("newwash-aff-code") || "";
  } catch (_) {
    /* Private browsing may block storage. The QR parameter still works. */
  }
  var code = (incomingCode || storedCode)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20);
  var orderEndpoint = new URL(script.getAttribute("data-order-endpoint") || "/api/newwash/orders", location.href);
  window.NewWashAff = { getAffiliateCode: () => code };
  var root = document.createElement("div");
  root.id = "newwash-popup-root";
  var shadow = root.attachShadow({ mode: "open" });
  var stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = origin + "/embed.css";
  shadow.appendChild(stylesheet);

  var bubble = document.createElement("button");
  bubble.type = "button";
  bubble.className = "newwash-bubble";
  bubble.hidden = true;
  var bubbleIcon = document.createElement("span");
  bubbleIcon.className = "newwash-bubble-icon";
  var bubbleImage = document.createElement("img");
  bubbleImage.src = origin + "/laundry-icons/washer-lightning.png";
  bubbleImage.alt = "";
  bubbleImage.setAttribute("aria-hidden", "true");
  bubbleIcon.appendChild(bubbleImage);
  var bubbleLabel = document.createElement("span");
  bubbleLabel.className = "newwash-bubble-label";
  bubbleLabel.textContent = "Đặt lịch giặt ủi";
  var bubbleArrow = document.createElement("span");
  bubbleArrow.className = "newwash-bubble-arrow";
  bubbleArrow.setAttribute("aria-hidden", "true");
  bubbleArrow.innerHTML =
    '<svg viewBox="0 0 20 20" fill="none"><path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  bubble.appendChild(bubbleIcon);
  bubble.appendChild(bubbleLabel);
  bubble.appendChild(bubbleArrow);
  bubble.setAttribute("aria-label", "Mở biểu mẫu đặt lịch giặt ủi");
  shadow.appendChild(bubble);

  var layer = document.createElement("div");
  layer.className = "newwash-layer";
  layer.setAttribute("aria-hidden", "true");
  var iframe = document.createElement("iframe");
  iframe.title = "Biểu mẫu đặt đơn giặt ủi NewWash";
  iframe.className = "newwash-frame";
  iframe.loading = "eager";
  layer.appendChild(iframe);
  shadow.appendChild(layer);
  (document.body || document.documentElement).appendChild(root);
  var closeTimer = 0;
  var layerOpen = false;
  var buttonOffsetX = 24;
  var buttonOffsetY = 24;

  function applyButtonPosition() {
    var maxX = Math.max(8, window.innerWidth - 208);
    var maxY = Math.max(8, window.innerHeight - 72);
    bubble.style.setProperty("--nw-offset-x", Math.min(buttonOffsetX, maxX) + "px");
    bubble.style.setProperty("--nw-offset-y", Math.min(buttonOffsetY, maxY) + "px");
  }

  function revealButton() {
    applyButtonPosition();
    bubble.hidden = false;
    window.requestAnimationFrame(() => {
      bubble.classList.add("is-ready");
    });
  }

  fetch(origin + "/api/embed-config", { mode: "cors", cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((config) => {
      if (!config) return;
      if (Number.isInteger(config.buttonOffsetX)) buttonOffsetX = Math.max(0, Math.min(400, config.buttonOffsetX));
      if (Number.isInteger(config.buttonOffsetY)) buttonOffsetY = Math.max(0, Math.min(400, config.buttonOffsetY));
    })
    .catch(() => {
      /* The default 24px inset remains usable when config is unavailable. */
    })
    .finally(revealButton);

  window.addEventListener("resize", applyButtonPosition, { passive: true });

  var frameUrl =
    origin +
    "/order?embed=1&aff=" +
    encodeURIComponent(code) +
    "&host=" +
    encodeURIComponent(location.origin) +
    (params.get("preview") === "1" ? "&preview=1" : "");

  function ensureFrame() {
    if (!iframe.getAttribute("src")) iframe.src = frameUrl;
  }

  function expandFrame() {
    iframe.contentWindow.postMessage({ type: "newwash:open" }, origin);
  }

  function open() {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = 0;
    }
    layer.classList.remove("is-closing");
    if (layerOpen) {
      expandFrame();
      return;
    }
    bubble.hidden = true;
    ensureFrame();
    layerOpen = true;
    layer.classList.add("is-open");
    layer.setAttribute("aria-hidden", "false");
    expandFrame();
  }

  function close() {
    if (!layerOpen || closeTimer) return;
    layerOpen = false;
    layer.classList.add("is-closing");
    closeTimer = window.setTimeout(() => {
      layer.classList.remove("is-open", "is-closing");
      layer.setAttribute("aria-hidden", "true");
      bubble.hidden = false;
      closeTimer = 0;
    }, 500);
  }

  iframe.addEventListener("load", () => {
    if (layerOpen) expandFrame();
  });

  bubble.addEventListener("click", open);
  window.addEventListener("message", (event) => {
    if (event.origin !== origin || event.source !== iframe.contentWindow) return;
    if (event.data && event.data.type === "newwash:ready" && layerOpen) expandFrame();
    if (event.data && event.data.type === "newwash:close") close();
    if (event.data && event.data.type === "newwash:order-submit") {
      const requestId = event.data.requestId;
      const order = event.data.order;
      if (typeof requestId !== "string" || !order || typeof order !== "object") return;
      (async () => {
        try {
          if (orderEndpoint.origin !== location.origin) throw new Error("API đặt đơn phải thuộc website cửa hàng.");
          const response = await fetch(orderEndpoint.href, {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(order),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || "Website chưa tạo được đơn.");
          const orderId = result.orderId || result.id;
          if (!orderId) throw new Error("Website chưa trả về mã đơn.");
          iframe.contentWindow.postMessage(
            { type: "newwash:order-result", requestId: requestId, orderId: orderId },
            origin,
          );
        } catch (error) {
          iframe.contentWindow.postMessage(
            {
              type: "newwash:order-result",
              requestId: requestId,
              error: error instanceof Error ? error.message : "Không tạo được đơn trên website.",
            },
            origin,
          );
        }
      })();
    }
  });

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(ensureFrame, { timeout: 1000 });
  } else {
    window.setTimeout(ensureFrame, 300);
  }

  if (params.get("nw_popup") === "1" && code) {
    if (document.readyState === "complete") open();
    else window.addEventListener("load", open, { once: true });
  }
})();
