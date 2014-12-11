define([
  'js/browser'
], function(
  gBrowser
) {
"use strict";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

function Tab(iframeParent) {
  this._iframeParent = iframeParent;

  let hbox = document.createElement("hbox");
  hbox.setAttribute("role", "tab");
  hbox.setAttribute("align", "center");

  let throbber = document.createElement("div");
  throbber.className = "throbber";

  let favicon = document.createElement("img");
  favicon.className = "favicon";

  let title = document.createElement("hbox");
  title.className = "title";

  let button = document.createElement("button");
  button.className = "close-button";
  button.onclick = (event) => {
    event.stopPropagation();
    gBrowser.closeTab(this);
  };

  hbox.appendChild(throbber);
  hbox.appendChild(favicon);
  hbox.appendChild(title);
  hbox.appendChild(button);

  this.clearTabData();

  this._dom = hbox;

  this.updateDom();
}

Tab.prototype = {

  get iframe() {
    if (!this.hasIframe()) {
      this._createIframe();
    }
    return this._iframe;
  },

  get dom() {
    return this._dom;
  },

  hasIframe: function() {
    return !!this._iframe;
  },

  _createIframe: function() {
    let iframe = document.createElement("iframe");
    iframe.setAttribute("mozbrowser", "true");
    iframe.setAttribute("flex", "1");
    iframe.setAttribute("remote", "true");
    iframe.setAttribute("role", "tabpanel");

    let tabIdIndex = 0;

    while(true) {
      let dummy = document.querySelector(
        "[role='tablist'] [role='tab'][aria-controls='__tab" + tabIdIndex + "']"
      );

      if (!dummy) {
        break;
      }

      ++tabIdIndex;
    }

    let tabId = "__tab" + tabIdIndex;
    this._dom.setAttribute("aria-controls", tabId);
    iframe.setAttribute("aria-labelledby", tabId);

    this._iframe = iframe;
    this._iframeParent.appendChild(iframe);

    if (this.isSelected) {
      iframe.show();
    } else {
      iframe.hide();
    }

    this._applyZoom();
    this._trackIframe();
  },

  destroy: function() {
    this.dom.remove();
    if (this.iframe) {
      this.iframe.remove();
    }
    this._selected = false;
  },

  isSelected: function() {
    return this._selected;
  },

  select: function() {
    if (this.hasIframe()) {
      this.iframe.show();
    }
    this.dom.setAttribute("aria-selected", "true");
    this._selected = true;
  },

  unselect: function() {
    if (this.hasIframe()) {
      this.iframe.hide();
    }
    this.dom.setAttribute("aria-selected", "false");
    this._selected = false;
  },

  _trackIframe: function() {
    let events = ["mozbrowserasyncscroll", "mozbrowserclose", "mozbrowsercontextmenu",
                  "mozbrowsererror", "mozbrowsericonchange", "mozbrowserloadend",
                  "mozbrowserloadstart", "mozbrowserlocationchange", "mozbrowseropenwindow",
                  "mozbrowsersecuritychange", "mozbrowsershowmodalprompt", "mozbrowsertitlechange",
                  "mozbrowserusernameandpasswordrequired"];
    for (let eventName of events) {
      this.iframe.addEventListener(eventName, this);
    }
  },

  get loading() { return this._loading },
  get title() { return this._title},
  get location() { return this._location},
  get favicon() { return this._favicon},
  get securityState() { return this._securityState},
  get securityExtendedValidation() { return this._securityExtendedValidation},

  updateDom: function() {
    if (this.loading) {
      this.dom.classList.add("loading");
    } else {
      this.dom.classList.remove("loading");
    }

    if (this.title) {
      this.dom.querySelector(".title").textContent = this.title;
    } else {
      if (this.location) {
        this.dom.querySelector(".title").textContent = this.location;
      } else {
        this.dom.querySelector(".title").textContent = "New Tab";
      }
    }

    let faviconImg = this.dom.querySelector(".favicon");
    if (this.favicon) {
      faviconImg.src = this.favicon;
    } else {
      faviconImg.removeAttribute("src");
    }
  },

  zoom: 1,
  zoomIn: function() {
    this.zoom += 0.1;
    this.zoom = Math.min(MAX_ZOOM, this.zoom);
    this._applyZoom();
  },
  zoomOut: function() {
    this.zoom -= 0.1;
    this.zoom = Math.max(MIN_ZOOM, this.zoom);
    this._applyZoom();
  },
  resetZoom: function() {
    this.zoom = 1;
    this._applyZoom();
  },
  _applyZoom: function() {
    if (this.hasIframe()) {
      this.iframe.zoom(this.zoom);
    }
  },

  clearTabData: function() {
    this._loading = false;
    this._title = "";
    this._location = "";
    this._favicon = "";
    this._securityState = "unsecure";
    this._securityExtendedValidation = false;
  },

  userInput: "",

  handleEvent: function(e) {
    let somethingChanged = true;
    switch(e.type) {
      case "mozbrowserloadstart":
        this.clearTabData();
        this._loading = true;
        break;
      case "mozbrowserloadend":
        this._loading = false;
        break;
      case "mozbrowsertitlechange":
        this._title = e.detail;
        break;
      case "mozbrowserlocationchange":
        this.userInput = "";
        this._location = e.detail;
        break;
      case "mozbrowsericonchange":
        this._favicon = e.detail.href;
        break;
      case "mozbrowsererror":
        this._loading = false;
        break;
      case "mozbrowseropenwindow":
        gBrowser.addTab(e.detail.url, true);
        break;
      case "mozbrowsersecuritychange":
        this._securityState = e.detail.state;
        this._securityExtendedValidation = e.detail.extendedValidation;
        break;
      default:
        somethingChanged = false;
    }
    if (somethingChanged) {
      this.updateDom();
      if (this.isSelected) {
        gBrowser.selectedTabHasChanged();
      }
    }
  },
}

return Tab;

});
