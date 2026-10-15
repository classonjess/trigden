(function () {
  var MEASUREMENT_ID = "G-FRXRX62VDX";
  var started = false;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  function choiceFromCookie() {
    var match = document.cookie.match(/(?:^|; )cookieyes-consent=([^;]*)/);
    if (!match) return null;
    var value;
    try { value = decodeURIComponent(match[1]); } catch (_) { return null; }
    var decided = /(?:^|,)action:yes(?:$|,)/.test(value) || /(?:^|,)consent:(?:yes|no)(?:$|,)/.test(value);
    if (!decided) return null;
    return /(?:^|,)analytics:yes(?:$|,)/.test(value);
  }

  function choiceFromEvent(event) {
    var detail = event && event.detail;
    if (!detail) return null;
    if (Array.isArray(detail.accepted)) {
      return detail.accepted.indexOf("analytics") !== -1;
    }
    if (detail.categories && Object.prototype.hasOwnProperty.call(detail.categories, "analytics")) {
      return !!detail.categories.analytics;
    }
    return null;
  }

  function clearAnalyticsCookies() {
    document.cookie.split(";").forEach(function (part) {
      var name = part.split("=")[0].trim();
      if (name !== "_ga" && name !== "_gid" && name.indexOf("_ga_") !== 0) return;
      document.cookie = name + "=; Max-Age=0; path=/";
      document.cookie = name + "=; Max-Age=0; path=/; domain=" + location.hostname;
    });
  }

  function denyAnalytics() {
    window.gtag("consent", "update", { analytics_storage: "denied" });
    clearAnalyticsCookies();
  }

  function allowAnalytics() {
    window.gtag("consent", "update", { analytics_storage: "granted" });
    if (started) return;
    started = true;
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
    document.head.appendChild(script);
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID);
  }

  function applyChoice(allowed) {
    if (allowed === true) allowAnalytics();
    else if (allowed === false) denyAnalytics();
  }

  document.addEventListener("cookieyes_consent_update", function (event) {
    var fromEvent = choiceFromEvent(event);
    applyChoice(fromEvent === null ? choiceFromCookie() : fromEvent);
  });

  applyChoice(choiceFromCookie());
})();
