(function () {
  var script = document.currentScript;
  if (!script || !script.src || document.getElementById("newwash-popup-root")) return;

  var origin = new URL(script.src).origin;
  var params = new URLSearchParams(location.search);
  var incomingCode = params.get("aff") || script.getAttribute("data-aff") || "";
  var storedCode = "";
  try {
    if (incomingCode) sessionStorage.setItem("newwash-aff-code", incomingCode);
    storedCode = sessionStorage.getItem("newwash-aff-code") || "";
  } catch (_) { /* Private browsing may block storage. The QR parameter still works. */ }
  var code = (incomingCode || storedCode)
    .toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  var orderEndpoint = new URL(script.getAttribute("data-order-endpoint") || "/api/newwash/orders", location.href);
  window.NewWashAff = { getAffiliateCode: function () { return code; } };
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
  bubble.textContent = "Đặt lịch giặt ủi";
  bubble.setAttribute("aria-label", "Mở biểu mẫu đặt lịch giặt ủi");
  shadow.appendChild(bubble);

  var dialog = document.createElement("dialog");
  dialog.className = "newwash-dialog";
  dialog.setAttribute("aria-label", "Đặt lịch giặt ủi NewWash");
  var iframe = document.createElement("iframe");
  iframe.title = "Biểu mẫu đặt đơn giặt ủi NewWash";
  iframe.className = "newwash-frame";
  iframe.loading = "eager";
  dialog.appendChild(iframe);
  shadow.appendChild(dialog);
  (document.body || document.documentElement).appendChild(root);

  var frameUrl = origin + "/order?embed=1&aff=" + encodeURIComponent(code)
    + "&host=" + encodeURIComponent(location.origin)
    + (params.get("preview") === "1" ? "&preview=1" : "");

  function ensureFrame() {
    if (!iframe.getAttribute("src")) iframe.src = frameUrl;
  }

  function expandFrame() {
    iframe.contentWindow.postMessage({ type: "newwash:open" }, origin);
  }

  function open() {
    if (dialog.open) return;
    bubble.hidden = true;
    ensureFrame();
    dialog.showModal();
    requestAnimationFrame(function () { dialog.classList.add("is-open"); });
    expandFrame();
  }

  function close() {
    if (!dialog.open || dialog.classList.contains("is-closing")) return;
    dialog.classList.add("is-closing");
    dialog.classList.remove("is-open");
    window.setTimeout(function () {
      dialog.close();
      dialog.classList.remove("is-closing");
    }, 160);
  }

  iframe.addEventListener("load", function () {
    if (dialog.open) expandFrame();
  });

  dialog.addEventListener("close", function () {
    dialog.classList.remove("is-open", "is-closing");
    bubble.hidden = false;
  });
  dialog.addEventListener("cancel", function (event) {
    event.preventDefault();
    close();
  });

  bubble.addEventListener("click", open);
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) close();
  });
  window.addEventListener("message", function (event) {
    if (event.origin !== origin || event.source !== iframe.contentWindow) return;
    if (event.data && event.data.type === "newwash:close") close();
    if (event.data && event.data.type === "newwash:order-submit") {
      var requestId = event.data.requestId;
      var order = event.data.order;
      if (typeof requestId !== "string" || !order || typeof order !== "object") return;
      (async function () {
        try {
          if (orderEndpoint.origin !== location.origin) throw new Error("API đặt đơn phải thuộc website cửa hàng.");
          var response = await fetch(orderEndpoint.href, {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(order),
          });
          var result = await response.json().catch(function () { return {}; });
          if (!response.ok) throw new Error(result.error || "Website chưa tạo được đơn.");
          var orderId = result.orderId || result.id;
          if (!orderId) throw new Error("Website chưa trả về mã đơn.");
          iframe.contentWindow.postMessage({ type: "newwash:order-result", requestId: requestId, orderId: orderId }, origin);
        } catch (error) {
          iframe.contentWindow.postMessage({ type: "newwash:order-result", requestId: requestId,
            error: error instanceof Error ? error.message : "Không tạo được đơn trên website." }, origin);
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
