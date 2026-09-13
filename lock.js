/* Password gate — 8-digit access code for LANTERN RUSH
   Loaded as the first thing in <head> on index.html.
   NOTE: this is a front-end-only lock (view-source reveals the code).
   It keeps casual visitors out, it isn't real security.
*/
(function () {
  var PASSWORD = "20112013";
  var SESSION_KEY = "lantern_rush_unlocked_v1";

  if (sessionStorage.getItem(SESSION_KEY) === "1") return;

  document.documentElement.style.visibility = "hidden";

  document.addEventListener("DOMContentLoaded", function () {
    document.documentElement.style.visibility = "visible";
    document.body.style.overflow = "hidden";

    var style = document.createElement("style");
    style.textContent = [
      "#lock-overlay{position:fixed;inset:0;z-index:999999;",
      "background:#0d0b08;background-image:repeating-linear-gradient(",
      "0deg,rgba(255,176,0,0.03) 0px,rgba(255,176,0,0.03) 1px,transparent 1px,transparent 3px);",
      "display:flex;align-items:center;justify-content:center;",
      "font-family:'Courier New',Consolas,monospace;animation:lockFlicker .4s ease-out;}",
      "@keyframes lockFlicker{0%{opacity:0}50%{opacity:.6}100%{opacity:1}}",
      ".lock-term{width:min(90vw,420px);border:1px solid #ffb000;",
      "box-shadow:0 0 24px rgba(255,176,0,0.25),inset 0 0 20px rgba(255,176,0,0.05);}",
      ".lock-term__bar{padding:8px 14px;border-bottom:1px solid #ffb000;",
      "color:#ffb000;font-size:12px;letter-spacing:2px;opacity:.8;}",
      ".lock-term__body{padding:28px 24px 32px;text-align:center;}",
      ".lock-term__prompt{color:#ffb000;font-size:13px;letter-spacing:1px;margin:0 0 20px;}",
      ".lock-term__digits{display:flex;gap:8px;justify-content:center;margin-bottom:18px;}",
      ".lock-digit{width:34px;height:44px;background:rgba(255,176,0,0.04);",
      "border:1px solid #ffb000;color:#ffb000;font-family:inherit;font-size:22px;",
      "text-align:center;caret-color:#ffb000;text-shadow:0 0 6px rgba(255,176,0,0.8);}",
      ".lock-digit:focus{outline:none;box-shadow:0 0 8px rgba(255,176,0,0.6);background:rgba(255,176,0,0.09);}",
      ".lock-term__msg{min-height:16px;font-size:12px;letter-spacing:2px;margin:0;}",
      ".lock-term__msg--ok{color:#7CFC9A;text-shadow:0 0 6px rgba(124,252,154,0.7);}",
      ".lock-term__msg--err{color:#ff5c5c;text-shadow:0 0 6px rgba(255,92,92,0.6);}",
      ".lock-term--shake{animation:lockShake .35s;}",
      "@keyframes lockShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}",
      "40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}"
    ].join("");
    document.head.appendChild(style);

    var overlay = document.createElement("div");
    overlay.id = "lock-overlay";
    overlay.innerHTML =
      '<div class="lock-term">' +
        '<div class="lock-term__bar">LANTERN RUSH · ACCESS CONTROL</div>' +
        '<div class="lock-term__body">' +
          '<p class="lock-term__prompt">ENTER 8-DIGIT ACCESS CODE</p>' +
          '<div class="lock-term__digits">' +
            Array.from({ length: 8 }).map(function () {
              return '<input class="lock-digit" type="tel" inputmode="numeric" maxlength="1" autocomplete="off">';
            }).join("") +
          "</div>" +
          '<p class="lock-term__msg">&nbsp;</p>' +
        "</div>" +
      "</div>";
    document.body.appendChild(overlay);

    var digits = overlay.querySelectorAll(".lock-digit");
    var msg = overlay.querySelector(".lock-term__msg");
    var term = overlay.querySelector(".lock-term");

    digits.forEach(function (input, idx) {
      input.addEventListener("input", function () {
        input.value = input.value.replace(/[^0-9]/g, "").slice(0, 1);
        if (input.value && idx < digits.length - 1) digits[idx + 1].focus();
        if (Array.prototype.every.call(digits, function (d) { return d.value.length === 1; })) {
          checkCode();
        }
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !input.value && idx > 0) digits[idx - 1].focus();
      });
    });

    function checkCode() {
      var code = Array.prototype.map.call(digits, function (d) { return d.value; }).join("");
      if (code === PASSWORD) {
        msg.textContent = "ACCESS GRANTED";
        msg.className = "lock-term__msg lock-term__msg--ok";
        sessionStorage.setItem(SESSION_KEY, "1");
        setTimeout(function () {
          overlay.remove();
          document.body.style.overflow = "";
        }, 500);
      } else {
        msg.textContent = "ACCESS DENIED";
        msg.className = "lock-term__msg lock-term__msg--err";
        term.classList.add("lock-term--shake");
        setTimeout(function () { term.classList.remove("lock-term--shake"); }, 350);
        digits.forEach(function (d) { d.value = ""; });
        digits[0].focus();
      }
    }

    setTimeout(function () { digits[0].focus(); }, 50);
  });
})();
