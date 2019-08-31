const template = document.createElement("template");
template.innerHTML = `
    <style>
      :host {
        display: flex;
        flex-wrap: wrap;
      }
      ::slotted(search-widget-panel) {
        flex-basis: 100%;
      }
    </style>
    <slot name="tab"></slot>
    <slot name="panel"></slot>
  `;

class SearchWidget extends HTMLElement {
  constructor() {
    super();

    this._onSlotChange = this._onSlotChange.bind(this);
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._tabSlot = this.shadowRoot.querySelector("slot[name=tab]");
    this._panelSlot = this.shadowRoot.querySelector("slot[name=panel]");
    this._tabSlot.addEventListener("slotchange", this._onSlotChange);
    this._panelSlot.addEventListener("slotchange", this._onSlotChange);
  }

  connectedCallback() {
    this.addEventListener("keydown", this._onKeyDown);
    this.addEventListener("click", this._onClick);

    if (!this.hasAttribute("role")) this.setAttribute("role", "tablist");

    Promise.all([
      customElements.whenDefined("search-widget-tab"),
      customElements.whenDefined("search-widget-panel")
    ]).then(_ => this._linkPanels());
  }

  disconnectedCallback() {
    this.removeEventListener("keydown", this._onKeyDown);
    this.removeEventListener("click", this._onClick);
  }

  _onSlotChange() {
    this._linkPanels();
  }

  _linkPanels() {
    const tabs = this._allTabs();
    tabs.forEach(tab => {
      const panel = tab.nextElementSibling;
      if (panel.tagName.toLowerCase() !== "search-widget-panel") {
        console.error(
          `Tab #${tab.id} is not a` + `sibling of a <search-widget-panel>`
        );
        return;
      }

      tab.setAttribute("aria-controls", panel.id);
      panel.setAttribute("aria-labelledby", tab.id);
    });

    const selectedTab = tabs.find(tab => tab.selected) || tabs[0];

    this._selectTab(selectedTab);
  }

  _allPanels() {
    return Array.from(this.querySelectorAll("search-widget-panel"));
  }

  _allTabs() {
    return Array.from(this.querySelectorAll("search-widget-tab"));
  }

  _panelForTab(tab) {
    const panelId = tab.getAttribute("aria-controls");
    return this.querySelector(`#${panelId}`);
  }

  _prevTab() {
    const tabs = this._allTabs();
    let newIdx = tabs.findIndex(tab => tab.selected) - 1;
    return tabs[(newIdx + tabs.length) % tabs.length];
  }

  _firstTab() {
    const tabs = this._allTabs();
    return tabs[0];
  }

  _lastTab() {
    const tabs = this._allTabs();
    return tabs[tabs.length - 1];
  }

  _nextTab() {
    const tabs = this._allTabs();
    let newIdx = tabs.findIndex(tab => tab.selected) + 1;
    return tabs[newIdx % tabs.length];
  }

  reset() {
    const tabs = this._allTabs();
    const panels = this._allPanels();

    tabs.forEach(tab => (tab.selected = false));
    panels.forEach(panel => (panel.hidden = true));
  }

  _selectTab(newTab) {
    // Deselect all tabs and hide all panels.
    this.reset();

    // Get the panel that the `newTab` is associated with.
    const newPanel = this._panelForTab(newTab);
    // If that panel doesn’t exist, abort.
    if (!newPanel) throw new Error(`No panel with id ${newPanelId}`);
    newTab.selected = true;
    newPanel.hidden = false;
    newTab.focus();
  }

  _onClick(event) {
    if (event.target.getAttribute("role") !== "tab") return;
    this._selectTab(event.target);
  }
}
customElements.define("search-widget", SearchWidget);

let howtoTabCounter = 0;

class SearchWidgetTab extends HTMLElement {
  static get observedAttributes() {
    return ["selected"];
  }

  constructor() {
    super();
  }

  connectedCallback() {
    // If this is executed, JavaScript is working and the element
    // changes its role to `tab`.
    this.setAttribute("role", "tab");
    if (!this.id) this.id = `search-widget-tab-generated-${howtoTabCounter++}`;

    // Set a well-defined initial state.
    this.setAttribute("aria-selected", "false");
    this.setAttribute("tabindex", -1);
    this._upgradeProperty("selected");
  }

  _upgradeProperty(prop) {
    if (this.hasOwnProperty(prop)) {
      let value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  attributeChangedCallback() {
    const value = this.hasAttribute("selected");
    this.setAttribute("aria-selected", value);
    this.setAttribute("tabindex", value ? 0 : -1);
  }

  set selected(value) {
    value = Boolean(value);
    if (value) this.setAttribute("selected", "");
    else this.removeAttribute("selected");
  }

  get selected() {
    return this.hasAttribute("selected");
  }
}
customElements.define("search-widget-tab", SearchWidgetTab);

// Number of panels in the widget
let searchWidgetPanelCounter = 0;

class SearchWidgetPanel extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.setAttribute("role", "tabpanel");
    if (!this.id)
      this.id = `search-widget-panel-generated-${searchWidgetPanelCounter++}`;
  }
}

customElements.define("search-widget-panel", SearchWidgetPanel);
