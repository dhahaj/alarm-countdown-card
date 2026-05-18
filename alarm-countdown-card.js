class AlarmCountdownCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._interval = null;
    this._initialized = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._buildDOM();
      this._initialized = true;
      this._startInterval();
    }
    this._update();
  }

  setConfig(config) {
    this._config = {
      time_entity: config.time_entity || config.entity,
      toggle_entity: config.toggle_entity,
      dismiss_entity: config.dismiss_entity || config.siren_entity,
      dismiss_action: config.dismiss_action,
      name: config.name || "Alarm",
      show_seconds: config.show_seconds !== false,
      icon: config.icon || "mdi:alarm",
      ...config,
    };

    // 1. Handle simple string in dismiss_action (legacy support or shorthand)
    if (typeof this._config.dismiss_action === "string") {
      const entityId = this._config.dismiss_action;
      this._config.dismiss_action = {
        action: "homeassistant.turn_off",
        target: { entity_id: entityId }
      };
      // If we don't have an explicit watcher, use this entity
      if (!this._config.dismiss_entity) {
        this._config.dismiss_entity = entityId;
      }
    }

    // 2. If no action at all, but we have a dismiss_entity, default to turning it off
    if (!this._config.dismiss_action && this._config.dismiss_entity) {
      this._config.dismiss_action = {
        action: "homeassistant.turn_off",
        target: { entity_id: this._config.dismiss_entity }
      };
    }

    // 3. Fallback: if we still have an action but NO watcher, try to extract watcher from action
    if (!this._config.dismiss_entity && this._config.dismiss_action) {
      const firstAction = Array.isArray(this._config.dismiss_action)
        ? this._config.dismiss_action[0]
        : this._config.dismiss_action;

      if (firstAction && firstAction.target && firstAction.target.entity_id) {
        this._config.dismiss_entity = firstAction.target.entity_id;
      }
    }
  }

  static getStubConfig() {
    return {
      time_entity: "input_datetime.alarm_time",
      toggle_entity: "input_boolean.alarm_active",
      dismiss_entity: "siren.alarm",
    };
  }

  getCardSize() { return 3; }

  _buildDOM() {
    var cfg = this._config;
    var style = document.createElement("style");
    style.textContent = "\n      :host {\n        --card-bg: var(--ha-card-background, var(--card-background-color, #1c1c2e));\n        --card-radius: var(--ha-card-border-radius, 16px);\n        --primary-text: var(--primary-text-color, #e1e1ef);\n        --secondary-text: var(--secondary-text-color, #9a9ab0);\n        --accent: var(--accent-color, #7c6cff);\n        --accent-glow: color-mix(in srgb, var(--accent) 40%, transparent);\n        --danger: #ff4c6a;\n        --danger-glow: rgba(255, 76, 106, 0.35);\n      }\n      .card {\n        background: var(--card-bg);\n        border-radius: var(--card-radius);\n        padding: 24px;\n        font-family: inherit;\n        position: relative;\n        overflow: hidden;\n        transition: opacity 0.3s ease;\n        border: 2px solid transparent;\n      }\n      .header {\n        display: flex;\n        align-items: center;\n        gap: 10px;\n        margin-bottom: 20px;\n      }\n      .header > ha-icon {\n        --mdc-icon-size: 22px;\n        color: var(--accent);\n        filter: drop-shadow(0 0 6px var(--accent-glow));\n        transition: color 0.3s, filter 0.3s, opacity 0.3s;\n      }\n      .header .title {\n        font-size: 14px;\n        font-weight: 600;\n        letter-spacing: 0.06em;\n        text-transform: uppercase;\n        color: var(--secondary-text);\n        flex: 1;\n      }\n      .toggle-btn {\n        background: none;\n        border: 1.5px solid color-mix(in srgb, var(--secondary-text) 30%, transparent);\n        border-radius: 10px;\n        color: var(--secondary-text);\n        font-size: 12px;\n        font-weight: 600;\n        padding: 5px 14px;\n        cursor: pointer;\n        display: flex;\n        align-items: center;\n        gap: 6px;\n        transition: all 0.2s ease;\n      }\n      .toggle-btn ha-icon {\n        --mdc-icon-size: 16px;\n        color: inherit;\n        filter: none;\n      }\n      .toggle-btn.on {\n        border-color: var(--accent);\n        color: var(--accent);\n        background: color-mix(in srgb, var(--accent) 10%, transparent);\n      }\n      .toggle-btn.off {\n        border-color: color-mix(in srgb, var(--secondary-text) 20%, transparent);\n        color: var(--secondary-text);\n        opacity: 0.7;\n      }\n      .toggle-btn:hover {\n        border-color: var(--accent);\n        color: var(--accent);\n        background: color-mix(in srgb, var(--accent) 12%, transparent);\n      }\n      .toggle-btn.missing {\n        border-color: #e8944c;\n        color: #e8944c;\n        opacity: 0.85;\n        font-size: 11px;\n      }\n      .countdown-wrap {\n        display: flex;\n        justify-content: center;\n        gap: 8px;\n        margin-bottom: 16px;\n        transition: opacity 0.3s, filter 0.3s;\n      }\n      .unit-box {\n        display: flex;\n        flex-direction: column;\n        align-items: center;\n        min-width: 64px;\n      }\n      .unit-value {\n        font-size: 48px;\n        font-weight: 700;\n        line-height: 1;\n        color: var(--primary-text);\n        font-variant-numeric: tabular-nums;\n        transition: color 0.3s;\n      }\n      .unit-label {\n        font-size: 11px;\n        font-weight: 500;\n        text-transform: uppercase;\n        letter-spacing: 0.1em;\n        color: var(--secondary-text);\n        margin-top: 6px;\n      }\n      .separator {\n        font-size: 40px;\n        font-weight: 300;\n        color: var(--secondary-text);\n        opacity: 0.4;\n        align-self: flex-start;\n        line-height: 1;\n        padding-top: 2px;\n      }\n      .blink .separator { animation: blink 2s ease-in-out infinite; }\n      @keyframes blink { 0%,100%{opacity:0.4} 50%{opacity:0.1} }\n      .sec-group { display: contents; }\n      .sec-group[hidden] { display: none; }\n      .alarm-target {\n        text-align: center;\n        font-size: 13px;\n        color: var(--secondary-text);\n        opacity: 0.7;\n        transition: opacity 0.3s;\n      }\n      .alarm-target .time {\n        font-weight: 600;\n        color: var(--accent);\n      }\n      .disabled-notice {\n        text-align: center;\n        font-size: 13px;\n        color: var(--secondary-text);\n        opacity: 0.6;\n        margin-top: 8px;\n      }\n      .disabled-notice[hidden] { display: none; }\n      .no-entity {\n        text-align: center;\n        padding: 16px;\n        color: var(--secondary-text);\n        font-size: 14px;\n      }\n      .no-entity[hidden] { display: none; }\n      .dismiss-wrap {\n        margin-top: 18px;\n        display: flex;\n        justify-content: center;\n      }\n      .dismiss-wrap[hidden] { display: none; }\n      .dismiss-btn {\n        background: var(--danger);\n        color: #fff;\n        border: none;\n        border-radius: 16px;\n        font-size: 18px;\n        font-weight: 700;\n        letter-spacing: 0.04em;\n        padding: 16px 48px;\n        cursor: pointer;\n        width: 100%;\n        max-width: 320px;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        gap: 10px;\n        box-shadow: 0 6px 28px var(--danger-glow);\n        animation: dismiss-pulse 1s ease-in-out infinite alternate;\n        transition: transform 0.1s;\n        -webkit-tap-highlight-color: transparent;\n      }\n      .dismiss-btn:active {\n        transform: scale(0.96);\n        animation: none;\n      }\n      .dismiss-btn ha-icon {\n        --mdc-icon-size: 24px;\n        color: #fff;\n        filter: none;\n      }\n      @keyframes dismiss-pulse {\n        from { box-shadow: 0 6px 28px var(--danger-glow); }\n        to   { box-shadow: 0 10px 44px var(--danger-glow), 0 0 20px var(--danger-glow); }\n      }\n      .card.dismiss-active {\n        border-color: var(--danger);\n        animation: card-flash 1.2s ease-in-out infinite alternate;\n      }\n      @keyframes card-flash {\n        from { border-color: var(--danger); }\n        to   { border-color: transparent; }\n      }\n      .card.dismiss-active .header > ha-icon {\n        color: var(--danger);\n        filter: drop-shadow(0 0 8px var(--danger-glow));\n        animation: icon-ring 0.4s ease-in-out infinite alternate;\n      }\n      @keyframes icon-ring {\n        from { transform: rotate(-8deg); }\n        to   { transform: rotate(8deg); }\n      }\n      .card.disabled .countdown-wrap {\n        opacity: 0.2;\n        filter: grayscale(0.8);\n      }\n      .card.disabled .alarm-target { opacity: 0.25; }\n      .card.disabled .header > ha-icon {\n        color: var(--secondary-text);\n        filter: none;\n        opacity: 0.5;\n      }\n      .card.ring-active .unit-value {\n        color: var(--accent);\n        animation: pulse 0.6s ease-in-out infinite alternate;\n      }\n      @keyframes pulse { from{opacity:1} to{opacity:0.4} }\n    ";

    this._card = document.createElement("div");
    this._card.className = "card";

    // Header
    var header = document.createElement("div");
    header.className = "header";

    var headerIcon = document.createElement("ha-icon");
    headerIcon.setAttribute("icon", cfg.icon);
    header.appendChild(headerIcon);

    var titleSpan = document.createElement("span");
    titleSpan.className = "title";
    titleSpan.textContent = cfg.name;
    header.appendChild(titleSpan);

    this.$toggleBtn = document.createElement("button");
    this.$toggleBtn.className = "toggle-btn on";
    this.$toggleBtn.id = "alarm-toggle";

    this.$toggleIcon = document.createElement("ha-icon");
    this.$toggleIcon.setAttribute("icon", "mdi:alarm");
    this.$toggleBtn.appendChild(this.$toggleIcon);

    this.$toggleLabel = document.createElement("span");
    this.$toggleLabel.className = "toggle-label";
    this.$toggleLabel.textContent = "On";
    this.$toggleBtn.appendChild(this.$toggleLabel);

    header.appendChild(this.$toggleBtn);
    this._card.appendChild(header);

    // No-entity notice
    this.$noEntity = document.createElement("div");
    this.$noEntity.className = "no-entity";
    this.$noEntity.hidden = true;
    this._card.appendChild(this.$noEntity);

    // Countdown
    this.$countdownWrap = document.createElement("div");
    this.$countdownWrap.className = "countdown-wrap blink";

    var makeUnit = function(id, label) {
      var box = document.createElement("div");
      box.className = "unit-box";
      var val = document.createElement("span");
      val.className = "unit-value";
      val.id = id;
      val.textContent = "--";
      var lbl = document.createElement("span");
      lbl.className = "unit-label";
      lbl.textContent = label;
      box.appendChild(val);
      box.appendChild(lbl);
      return box;
    };

    var makeSep = function() {
      var sep = document.createElement("div");
      sep.className = "separator";
      sep.textContent = ":";
      return sep;
    };

    this.$countdownWrap.appendChild(makeUnit("val-h", "Hr"));
    this.$countdownWrap.appendChild(makeSep());
    this.$countdownWrap.appendChild(makeUnit("val-m", "Min"));

    this.$secGroup = document.createElement("span");
    this.$secGroup.className = "sec-group";
    this.$secGroup.appendChild(makeSep());
    this.$secGroup.appendChild(makeUnit("val-s", "Sec"));
    this.$secGroup.hidden = !cfg.show_seconds;
    this.$countdownWrap.appendChild(this.$secGroup);

    this._card.appendChild(this.$countdownWrap);

    // Alarm target line
    this.$alarmTarget = document.createElement("div");
    this.$alarmTarget.className = "alarm-target";
    this.$alarmTarget.innerHTML = 'Alarm set for <span class="time" id="alarm-time">--:--</span>';
    this._card.appendChild(this.$alarmTarget);

    // Disabled notice
    this.$disabledNotice = document.createElement("div");
    this.$disabledNotice.className = "disabled-notice";
    this.$disabledNotice.hidden = true;
    this.$disabledNotice.textContent = "Alarm disabled";
    this._card.appendChild(this.$disabledNotice);

    // Dismiss button wrap
    this.$dismissWrap = document.createElement("div");
    this.$dismissWrap.className = "dismiss-wrap";
    this.$dismissWrap.hidden = true;

    this.$dismissBtn = document.createElement("button");
    this.$dismissBtn.className = "dismiss-btn";
    this.$dismissBtn.id = "dismiss-btn";

    var dismissIcon = document.createElement("ha-icon");
    dismissIcon.setAttribute("icon", "mdi:alarm-off");
    this.$dismissBtn.appendChild(dismissIcon);
    this.$dismissBtn.appendChild(document.createTextNode(" Dismiss"));

    this.$dismissWrap.appendChild(this.$dismissBtn);
    this._card.appendChild(this.$dismissWrap);

    // Append to shadow root
    this.shadowRoot.append(style, this._card);

    // Cache value refs
    this.$valH = this._card.querySelector("#val-h");
    this.$valM = this._card.querySelector("#val-m");
    this.$valS = this._card.querySelector("#val-s");
    this.$alarmTime = this._card.querySelector("#alarm-time");

    // Bind events once
    var self = this;

    this.$toggleBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      if (!self._hass) return;
      var te = self._hass.states[self._config.toggle_entity];
      if (!te) {
        alert('Entity "' + self._config.toggle_entity + '" not found.');
        return;
      }
      self._hass.callService("homeassistant", "toggle", {
        entity_id: self._config.toggle_entity,
      });
    });

    this.$dismissBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      if (!self._hass) return;

      const actions = Array.isArray(self._config.dismiss_action)
        ? self._config.dismiss_action
        : [self._config.dismiss_action];

      actions.forEach(action => {
        const actionParts = action.action.split(".");
        const domain = actionParts[0];
        const service = actionParts[1];

        self._hass.callService(domain, service, {
          ...action.data,
          ...action.target,
        });
      });
    });
  }

  _startInterval() {
    if (this._interval) clearInterval(this._interval);
    var self = this;
    this._interval = setInterval(function() { self._update(); }, 1000);
  }

  _getTargetDate() {
    var entity = this._hass.states[this._config.time_entity];
    if (!entity) return null;

    var now = new Date();
    var hour, minute, second;

    // Try parsing as ISO 8601 timestamp first
    var timestamp = Date.parse(entity.state);
    if (!isNaN(timestamp)) {
      var target = new Date(timestamp);
      // If the timestamp is just a time (not a full date), it might be in the past
      // But usually ISO timestamps are full dates.
      return target;
    }

    if (entity.attributes.hour !== undefined) {
      hour = entity.attributes.hour;
      minute = entity.attributes.minute || 0;
      second = entity.attributes.second || 0;
    } else {
      var parts = entity.state.split(":");
      hour = parseInt(parts[0], 10);
      minute = parseInt(parts[1], 10);
      second = parts[2] ? parseInt(parts[2], 10) : 0;
    }

    if (isNaN(hour) || isNaN(minute)) return null;

    var target = new Date(now);
    target.setHours(hour, minute, second, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target;
  }

  _formatTime12(hour, minute) {
    var ampm = hour >= 12 ? "PM" : "AM";
    var h = hour % 12 || 12;
    var m = String(minute).padStart(2, "0");
    return h + ":" + m + " " + ampm;
  }

  _update() {
    if (!this._hass || !this._card) return;

    var pad = function(n) { return String(n).padStart(2, "0"); };
    var entity = this._hass.states[this._config.time_entity];
    var toggleEntity = this._hass.states[this._config.toggle_entity];
    var monitorEntity = this._hass.states[this._config.dismiss_entity];
    
    var dismissActive = monitorEntity && monitorEntity.state === "on";
    var toggleExists = !!toggleEntity;
    var enabled = toggleExists ? toggleEntity.state === "on" : true;

    // Toggle button state
    if (toggleExists) {
      this.$toggleBtn.className = "toggle-btn " + (enabled ? "on" : "off");
      this.$toggleIcon.setAttribute("icon", enabled ? "mdi:alarm" : "mdi:alarm-off");
      this.$toggleLabel.textContent = enabled ? "On" : "Off";
    } else {
      this.$toggleBtn.className = "toggle-btn missing";
      this.$toggleIcon.setAttribute("icon", "mdi:alert-circle-outline");
      this.$toggleLabel.textContent = this._config.toggle_entity || "Not set";
    }

    // Dismiss button visibility
    this.$dismissWrap.hidden = !dismissActive;

    // Missing datetime entity
    if (!entity) {
      this.$noEntity.hidden = false;
      this.$noEntity.innerHTML = 'Entity <b>' + (this._config.time_entity || "undefined") + '</b> not found';
      this.$countdownWrap.style.display = "none";
      this.$alarmTarget.style.display = "none";
      this.$disabledNotice.hidden = true;
      return;
    }

    this.$noEntity.hidden = true;
    this.$countdownWrap.style.display = "";
    this.$alarmTarget.style.display = "";

    var target = this._getTargetDate();
    if (!target) {
      this.$noEntity.hidden = false;
      this.$noEntity.textContent = "Could not parse alarm time";
      this.$countdownWrap.style.display = "none";
      this.$alarmTarget.style.display = "none";
      return;
    }

    var now = new Date();
    var diff = Math.max(0, Math.floor((target - now) / 1000));
    var hours = Math.floor(diff / 3600);
    diff %= 3600;
    var minutes = Math.floor(diff / 60);
    var seconds = diff % 60;

    this.$valH.textContent = pad(hours);
    this.$valM.textContent = pad(minutes);
    this.$valS.textContent = pad(seconds);

    var alarmHour = entity.attributes.hour !== undefined ? entity.attributes.hour : parseInt(entity.state.split(":")[0], 10);
    var alarmMinute = entity.attributes.minute !== undefined ? entity.attributes.minute : parseInt(entity.state.split(":")[1], 10);
    this.$alarmTime.textContent = this._formatTime12(alarmHour, alarmMinute);

    var isNearAlarm = enabled && hours === 0 && minutes === 0 && seconds <= 5;
    var cls = "card";
    if (!enabled) cls += " disabled";
    if (isNearAlarm) cls += " ring-active";
    if (dismissActive) cls += " dismiss-active";
    this._card.className = cls;

    this.$disabledNotice.hidden = enabled;
    this.$countdownWrap.classList.toggle("blink", enabled);
  }

  disconnectedCallback() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }
}

customElements.define("alarm-countdown-card", AlarmCountdownCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "alarm-countdown-card",
  name: "Alarm Countdown",
  description: "Countdown to alarm with toggle and siren dismiss.",
  preview: true,
});

console.info(
  "%c ALARM-COUNTDOWN-CARD %c v5 loaded ",
  "background:#7c6cff;color:#fff;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px",
  "background:#333;color:#ccc;padding:2px 6px;border-radius:0 4px 4px 0"
);
