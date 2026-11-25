/* ==========================================================================
   Clean toot — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : แสดงสินค้า + กรองตาม mood
   - order.html   : เติมฟอร์มจาก URL parameter + ส่งออเดอร์
   - admin.html   : แสดงออเดอร์จาก Google Sheet (CSV)
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- ค่าคงที่ ---------- */
  var PRODUCTS_URL = "products.json";
  var ORDER_ENDPOINT =
    "https://script.google.com/macros/s/AKfycbz3BusRgPMccf8KJRZRpvN_qCCv4P8TDzorKCen4-d4fRiDG1f0l7T1hxpbhgzkmRM/exec";
  var ORDERS_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSHyg1hRhG636qepfQG4ncuTZpvw_DitiQEWCyg42ylAfx8ihx3lwnoYkOWrwgRJwPWBSKxVFl_7csY/pub?gid=0&single=true&output=csv";

  var MOODS = [
    { key: "all", label: "ทั้งหมด" },
    { key: "fresh", label: "Fresh" },
    { key: "sweet", label: "Sweet" },
    { key: "confident", label: "Confident" },
    { key: "romance", label: "Romance" }
  ];

  /* ---------- helpers ---------- */
  function $(selector) {
    return document.querySelector(selector);
  }

  function formatPrice(n) {
    return Number(n).toLocaleString("th-TH");
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  /* ==========================================================================
     1) หน้า product.html
     ========================================================================== */
  function initProductPage() {
    var filterBar = $("#filter-bar");
    var list = $("#product-list");
    if (!filterBar || !list) return;

    var products = [];
    var activeMood = "all";

    // ชื่อที่ส่งไปหน้าสั่งซื้อ: ชื่อ + ไซส์ (ไม่ซ้ำถ้าชื่อมีไซส์อยู่แล้ว)
    function orderItemName(p) {
      if (p.size && p.name.indexOf(p.size) === -1) {
        return p.name + " " + p.size;
      }
      return p.name;
    }

    function orderUrl(p) {
      return (
        "order.html?item=" +
        encodeURIComponent(orderItemName(p)) +
        "&price=" +
        encodeURIComponent(p.price)
      );
    }

    function moodLabel(key) {
      for (var i = 0; i < MOODS.length; i++) {
        if (MOODS[i].key === key) return MOODS[i].label;
      }
      return key;
    }

    function buildCard(p) {
      var card = document.createElement("article");
      card.className = "product-card";
      card.setAttribute("data-mood", p.mood);

      var media = document.createElement("div");
      media.className = "product-card__media";
      var img = document.createElement("img");
      img.src = p.image;
      img.alt = p.name;
      img.loading = "lazy";
      media.appendChild(img);

      var body = document.createElement("div");
      body.className = "product-card__body";

      var mood = document.createElement("span");
      mood.className = "mood";
      mood.textContent = moodLabel(p.mood);

      var title = document.createElement("h3");
      title.className = "product-card__title";
      title.textContent = p.name;

      body.appendChild(mood);
      body.appendChild(title);

      if (p.size) {
        var meta = document.createElement("div");
        meta.className = "product-card__meta";
        meta.textContent = p.size;
        body.appendChild(meta);
      }

      var footer = document.createElement("div");
      footer.className = "product-card__footer";

      var price = document.createElement("span");
      price.className = "price";
      price.textContent = formatPrice(p.price);
      var unit = document.createElement("small");
      unit.textContent = "บาท";
      price.appendChild(unit);

      var btn = document.createElement("a");
      btn.className = "btn btn--gold btn--small";
      btn.href = orderUrl(p);
      btn.textContent = "สั่งซื้อ";

      footer.appendChild(price);
      footer.appendChild(btn);
      body.appendChild(footer);

      card.appendChild(media);
      card.appendChild(body);
      return card;
    }

    function render() {
      list.innerHTML = "";
      var shown = products.filter(function (p) {
        return activeMood === "all" || p.mood === activeMood;
      });

      if (shown.length === 0) {
        var empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "ยังไม่มีสินค้าในหมวดนี้";
        list.appendChild(empty);
        return;
      }

      shown.forEach(function (p) {
        list.appendChild(buildCard(p));
      });
    }

    function renderFilterBar() {
      filterBar.innerHTML = "";
      MOODS.forEach(function (m) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = m.label;
        btn.setAttribute("data-mood", m.key);
        if (m.key === activeMood) btn.classList.add("is-active");
        btn.addEventListener("click", function () {
          setMood(m.key, true);
        });
        filterBar.appendChild(btn);
      });
    }

    function setMood(key, updateUrl) {
      activeMood = key;
      var buttons = filterBar.querySelectorAll("button");
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.toggle(
          "is-active",
          buttons[i].getAttribute("data-mood") === key
        );
      }
      if (updateUrl && window.history && history.replaceState) {
        var url = new URL(window.location.href);
        if (key === "all") {
          url.searchParams.delete("mood");
        } else {
          url.searchParams.set("mood", key);
        }
        history.replaceState(null, "", url.toString());
      }
      render();
    }

    // mood เริ่มต้นจาก ?mood=xxx (ถ้าไม่ถูกต้องให้ใช้ "ทั้งหมด")
    var initial = (getParam("mood") || "all").toLowerCase();
    var valid = MOODS.some(function (m) {
      return m.key === initial;
    });
    activeMood = valid ? initial : "all";
    renderFilterBar();

    fetch(PRODUCTS_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        products = Array.isArray(data) ? data : data.products || [];
        render();
      })
      .catch(function (error) {
        console.error(error);
        list.innerHTML = "";
        var msg = document.createElement("p");
        msg.className = "muted";
        msg.textContent = "ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง";
        list.appendChild(msg);
      });
  }

  /* ==========================================================================
     2) หน้า order.html
     ========================================================================== */
  function initOrderPage() {
    var form = $("#orderForm");
    if (!form) return;

    var itemsField = $("#items");
    var totalField = $("#total");

    // เติมค่าจาก URL parameter ทันทีที่โหลดหน้า — ทั้ง items และ total
    var item = getParam("item");
    var price = getParam("price");
    if (item !== null && itemsField) itemsField.value = item;
    if (price !== null && totalField) totalField.value = price;

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (typeof form.reportValidity === "function" && !form.reportValidity()) {
        return;
      }

      var payload = {
        customerName: $("#customerName").value.trim(),
        contact: $("#contact").value.trim(),
        items: $("#items").value.trim(),
        total: $("#total").value.trim(),
        note: $("#note") ? $("#note").value.trim() : ""
      };

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(ORDER_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(payload)
      })
        .then(function () {
          window.location.href = "thankyou.html";
        })
        .catch(function (error) {
          console.error(error);
          alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* ==========================================================================
     3) หน้า admin.html
     ========================================================================== */

  // parse CSV เอง: รองรับ "..." ครอบ, "" แทนเครื่องหมายคำพูด,
  // ลูกน้ำและขึ้นบรรทัดใหม่ภายในช่อง, และ \r\n
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;

    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // ตัด BOM

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }

    // แถวสุดท้ายที่ไม่มี newline ปิดท้าย
    if (field !== "" || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    // ตัดแถวว่างทิ้ง
    return rows.filter(function (r) {
      return r.some(function (c) {
        return c.trim() !== "";
      });
    });
  }

  function initAdminPage() {
    var tbody = $("#ordersTable tbody");
    if (!tbody) return;

    function showMessage(text) {
      tbody.innerHTML = "";
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = text;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    showMessage("กำลังโหลดข้อมูล...");

    fetch(ORDERS_CSV_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (csv) {
        var rows = parseCSV(csv);
        rows.shift(); // แถวแรกคือหัวตาราง

        if (rows.length === 0) {
          showMessage("ยังไม่มีรายการสั่งซื้อ");
          return;
        }

        // ออเดอร์ใหม่ถูกต่อท้ายชีตเสมอ จึงกลับลำดับให้ล่าสุดขึ้นก่อน
        rows.reverse();

        tbody.innerHTML = "";
        rows.forEach(function (r) {
          var tr = document.createElement("tr");
          // คอลัมน์: วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, ยอดรวม, หมายเหตุ
          for (var c = 0; c < 6; c++) {
            var td = document.createElement("td");
            td.textContent = r[c] !== undefined ? r[c] : "";
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (error) {
        console.error(error);
        showMessage("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
      });
  }

  /* ---------- เริ่มทำงาน (แต่ละฟังก์ชันจะทำงานเฉพาะหน้าที่มี element ของตัวเอง) ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initProductPage();
    initOrderPage();
    initAdminPage();
  });
})();
