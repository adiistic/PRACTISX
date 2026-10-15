// OrderFlow - Frontend Application Logic
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("order-form");
  const productIdInput = document.getElementById("product-id");
  const quantityInput = document.getElementById("quantity");
  const customerEmailInput = document.getElementById("customer-email");
  const submitBtn = document.getElementById("submit-btn");
  const qtyDecreaseBtn = document.getElementById("qty-decrease");
  const qtyIncreaseBtn = document.getElementById("qty-increase");
  const presetTags = document.querySelectorAll(".preset-tag");
  const ordersContainer = document.getElementById("orders-container");
  const emptyState = document.getElementById("empty-state");
  const refreshBtn = document.getElementById("refresh-orders-btn");
  const latestOrderBanner = document.getElementById("latest-order-banner");
  const latestOrderContent = document.getElementById("latest-order-content");
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");
  const toastIcon = document.getElementById("toast-icon");

  let toastTimer = null;

  // Preset Tags click handler
  presetTags.forEach(tag => {
    tag.addEventListener("click", () => {
      productIdInput.value = tag.getAttribute("data-preset");
      productIdInput.focus();
    });
  });

  // Quantity stepper handlers
  qtyDecreaseBtn.addEventListener("click", () => {
    let current = parseInt(quantityInput.value, 10) || 1;
    if (current > 1) {
      quantityInput.value = current - 1;
    }
  });

  qtyIncreaseBtn.addEventListener("click", () => {
    let current = parseInt(quantityInput.value, 10) || 0;
    quantityInput.value = current + 1;
  });

  quantityInput.addEventListener("change", () => {
    let val = parseInt(quantityInput.value, 10);
    if (isNaN(val) || val < 1) {
      quantityInput.value = 1;
    }
  });

  // Fetch initial orders
  loadOrders();

  // Refresh button handler
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadOrders(true);
    });
  }

  // Handle Form Submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const productId = productIdInput.value.trim();
    const quantity = parseInt(quantityInput.value, 10);
    const customerEmail = customerEmailInput.value.trim();

    // Client-side validation checks
    if (!productId) {
      showToast("Please enter a valid Product ID", "error");
      productIdInput.focus();
      return;
    }

    if (!quantity || quantity <= 0) {
      showToast("Quantity must be an integer greater than 0", "error");
      quantityInput.focus();
      return;
    }

    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      showToast("Please enter a valid customer email address", "error");
      customerEmailInput.focus();
      return;
    }

    // Set loading state
    setLoading(true);

    try {
      // POST request to backend
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId,
          quantity,
          customerEmail
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || `Error ${response.status}: Failed to create order`);
      }

      // Success
      showToast(`Order #${data.order.id} placed successfully!`, "success");
      displayLatestOrder(data.order);
      
      // Reset inputs
      form.reset();
      quantityInput.value = 1;

      // Reload order list
      loadOrders();

    } catch (err) {
      console.error("Order submission error:", err);
      showToast(err.message || "Failed to submit order. Check server connection.", "error");
    } finally {
      setLoading(false);
    }
  });

  // Display Latest Order Banner
  function displayLatestOrder(order) {
    if (!latestOrderBanner || !latestOrderContent) return;

    latestOrderContent.innerHTML = `
      <div class="order-receipt-grid">
        <div class="receipt-item">
          <span class="label">Order ID</span>
          <span class="val">#${order.id}</span>
        </div>
        <div class="receipt-item">
          <span class="label">Product</span>
          <span class="val">${escapeHtml(order.productId)}</span>
        </div>
        <div class="receipt-item">
          <span class="label">Quantity</span>
          <span class="val">${order.quantity} units</span>
        </div>
        <div class="receipt-item">
          <span class="label">Customer</span>
          <span class="val">${escapeHtml(order.customerEmail)}</span>
        </div>
      </div>
    `;

    latestOrderBanner.classList.remove("hidden");
  }

  // Load orders from API
  async function loadOrders(isManualRefresh = false) {
    try {
      const response = await fetch("/api/orders");
      if (!response.ok) return;

      const data = await response.json();
      if (!data.success || !Array.isArray(data.orders)) return;

      renderOrdersList(data.orders);

      if (isManualRefresh) {
        showToast("Orders refreshed", "success");
      }
    } catch (err) {
      console.warn("Could not fetch orders list:", err);
    }
  }

  // Render orders list
  function renderOrdersList(orders) {
    if (!ordersContainer) return;

    if (orders.length === 0) {
      ordersContainer.innerHTML = "";
      if (emptyState) ordersContainer.appendChild(emptyState);
      return;
    }

    ordersContainer.innerHTML = orders.map(order => {
      const dateFormatted = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="order-item-card" id="order-${order.id}">
          <div class="order-meta-left">
            <span class="order-id-tag">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              Order #${order.id}
            </span>
            <span class="order-detail-sub">${escapeHtml(order.productId)} &bull; ${order.quantity} unit${order.quantity > 1 ? 's' : ''}</span>
            <span class="order-detail-sub">${escapeHtml(order.customerEmail)}</span>
          </div>
          <div class="order-meta-right">
            <span class="badge-status ${order.status}">${order.status}</span>
            <span class="order-time">${dateFormatted}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  // Loading state helper
  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.classList.add("loading");
      submitBtn.disabled = true;
    } else {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
    }
  }

  // Toast Notification helper
  function showToast(msg, type = "success") {
    if (!toast) return;

    clearTimeout(toastTimer);

    toast.className = `toast ${type}`;
    toastMessage.textContent = msg;

    if (type === "success") {
      toastIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else {
      toastIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    }

    toast.classList.remove("hidden");

    toastTimer = setTimeout(() => {
      toast.classList.add("hidden");
    }, 4000);
  }

  // HTML sanitization helper
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
