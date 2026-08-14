/**
 * Singapore Car Park & EV Charging Finder - Frontend Application Logic
 * 
 * Target: Vanilla JavaScript with Material Design principles & WCAG 2.1 AA accessibility.
 * Every function contains detailed comments explaining its purpose, parameters, and behavior.
 */

// Global Application State
const state = {
  userLocation: {
    lat: 1.290270, // Default: City Hall / Singapore CBD
    lng: 103.851959
  },
  radiusKm: 2.0, // Default search radius: 2.0km (Range: 1.0km - 3.0km)
  evFilterOnly: false, // Default: Show all car parks
  carparks: [], // List of car parks currently within radius
  leafMap: null, // Leaflet OneMap instance
  radiusCircle: null, // Radius circle overlay
  userMarker: null, // Leaflet User Location Marker
  carparkMarkers: [], // Array of active car park map markers
  refreshIntervalId: null, // 1-Minute Interval Timer ID
  refreshSecondsRemaining: 60, // Countdown timer for 1-minute auto-refresh
  countdownIntervalId: null,
  isFetching: false,
  searchDebounceTimer: null,
  activeSearchIndex: -1,
  searchResults: []
};

// DOM Element References (Cached after DOM Content Loaded)
const elements = {
  mapContainer: null,
  onemapSearchInput: null,
  onemapSearchDropdown: null,
  clearSearchBtn: null,
  districtSelect: null,
  locateMeBtn: null,
  radiusSlider: null,
  radiusValueText: null,
  evToggleBtn: null,
  evToggleStatusText: null,
  carparksList: null,
  resultsCountTitle: null,
  resultsSummaryText: null,
  locationDisplayText: null,
  refreshIndicator: null,
  refreshTimerText: null,
  refreshSpinner: null,
  manualRefreshBtn: null,
  dockForceRefreshBtn: null,
  toggleSidebarBtn: null,
  closeSidebarBtn: null,
  carparksSidebar: null,
  detailModalBackdrop: null,
  closeModalBtn: null,
  modalAgencyTag: null,
  modalCarparkTitle: null,
  modalCarparkArea: null,
  modalCarparkBody: null,
  modalNavigateBtn: null,
  tabBtnMap: null,
  tabBtnFeedback: null,
  mainContent: null,
  tabViewFeedback: null
};

/**
 * Initializes DOM element references and attaches all event listeners once HTML is loaded.
 * This is the entry point that runs when the web page finishes loading.
 */
function initApplication() {
  cacheDOMElements();
  setupEventListeners();
  startOneMinuteRefreshTimer();
  requestUserGeolocation();
  initOneMap();
  fetchCarParkData();
}

/**
 * Caches HTML element references from the DOM into a central object.
 * This avoids repeated document.getElementById calls for better performance.
 */
function cacheDOMElements() {
  elements.mapContainer = document.getElementById("onemap-container");
  elements.onemapSearchInput = document.getElementById("onemap-search-input");
  elements.searchSubmitBtn = document.getElementById("search-submit-btn");
  elements.onemapSearchDropdown = document.getElementById("onemap-search-dropdown");
  elements.clearSearchBtn = document.getElementById("clear-search-btn");
  elements.districtSelect = document.getElementById("district-select");
  elements.locateMeBtn = document.getElementById("locate-me-btn");
  elements.radiusSlider = document.getElementById("radius-slider");
  elements.radiusValueText = document.getElementById("radius-value-text");
  elements.evToggleBtn = document.getElementById("ev-toggle-btn");
  elements.evToggleStatusText = document.getElementById("ev-toggle-status-text");
  elements.carparksList = document.getElementById("carparks-list");
  elements.resultsCountTitle = document.getElementById("results-count-title");
  elements.resultsSummaryText = document.getElementById("results-summary-text");
  elements.locationDisplayText = document.getElementById("location-display-text");
  elements.refreshIndicator = document.getElementById("refresh-indicator");
  elements.refreshTimerText = document.getElementById("refresh-timer-text");
  elements.refreshSpinner = document.getElementById("refresh-spinner");
  elements.manualRefreshBtn = document.getElementById("manual-refresh-btn");
  elements.dockForceRefreshBtn = document.getElementById("dock-force-refresh-btn");
  elements.toggleSidebarBtn = document.getElementById("toggle-sidebar-btn");
  elements.closeSidebarBtn = document.getElementById("close-sidebar-btn");
  elements.carparksSidebar = document.getElementById("carparks-sidebar");
  elements.detailModalBackdrop = document.getElementById("detail-modal-backdrop");
  elements.closeModalBtn = document.getElementById("close-modal-btn");
  elements.modalAgencyTag = document.getElementById("modal-agency-tag");
  elements.modalCarparkTitle = document.getElementById("modal-carpark-title");
  elements.modalCarparkArea = document.getElementById("modal-carpark-area");
  elements.modalCarparkBody = document.getElementById("modal-carpark-body");
  elements.modalNavigateBtn = document.getElementById("modal-navigate-btn");
  elements.tabBtnMap = document.getElementById("tab-btn-map");
  elements.tabBtnFeedback = document.getElementById("tab-btn-feedback");
  elements.mainContent = document.getElementById("main-content");
  elements.tabViewFeedback = document.getElementById("tab-view-feedback");
}

/**
 * Attaches user interaction event listeners (Clicks, Slider input changes, Key presses).
 * No inline JavaScript (such as onclick="...") is used in the HTML markup.
 */
function setupEventListeners() {
  // Navigation Tabs Switching (Map & Car Parks vs Feedback)
  if (elements.tabBtnMap) {
    elements.tabBtnMap.addEventListener("click", () => switchMainTab("map"));
  }
  if (elements.tabBtnFeedback) {
    elements.tabBtnFeedback.addEventListener("click", () => switchMainTab("feedback"));
  }
  // OneMap Search Bar Live Typing & Autocomplete
  if (elements.onemapSearchInput) {
    elements.onemapSearchInput.addEventListener("input", handleOneMapSearchInput);
    elements.onemapSearchInput.addEventListener("keydown", handleOneMapSearchKeyDown);
    elements.onemapSearchInput.addEventListener("focus", () => {
      if (state.searchResults.length > 0 && elements.onemapSearchDropdown) {
        elements.onemapSearchDropdown.hidden = false;
      }
    });
  }

  // Search Submit Button Click
  if (elements.searchSubmitBtn) {
    elements.searchSubmitBtn.addEventListener("click", () => {
      const query = elements.onemapSearchInput ? elements.onemapSearchInput.value.trim() : "";
      if (query.length >= 2) {
        executeOneMapSearch(query, true);
      }
    });
  }

  // Clear Search Input Button
  if (elements.clearSearchBtn) {
    elements.clearSearchBtn.addEventListener("click", handleClearSearch);
  }

  // Close search dropdown on click outside
  document.addEventListener("click", (e) => {
    if (elements.onemapSearchDropdown && !e.target.closest("#onemap-search-wrapper")) {
      elements.onemapSearchDropdown.hidden = true;
    }
  });

  // Radius Slider Input Event (1.0km to 3.0km)
  if (elements.radiusSlider) {
    elements.radiusSlider.addEventListener("input", handleRadiusSliderInput);
    elements.radiusSlider.addEventListener("change", handleRadiusSliderChange);
  }

  // EV Charging Filter Toggle Button Click Event
  if (elements.evToggleBtn) {
    elements.evToggleBtn.addEventListener("click", handleEVFilterToggle);
  }

  // Quick District Area Selector Change Event
  if (elements.districtSelect) {
    elements.districtSelect.addEventListener("change", handleDistrictSelectChange);
  }

  // GPS Locate Me Button Click Event
  if (elements.locateMeBtn) {
    elements.locateMeBtn.addEventListener("click", handleLocateMeClick);
  }

  // Manual Refresh Button Click Events (Header & Floating Bottom Dock)
  if (elements.manualRefreshBtn) {
    elements.manualRefreshBtn.addEventListener("click", handleManualRefreshClick);
  }
  if (elements.dockForceRefreshBtn) {
    elements.dockForceRefreshBtn.addEventListener("click", handleManualRefreshClick);
  }

  // Mobile Sidebar Drawer Toggle & Close Buttons
  if (elements.toggleSidebarBtn) {
    elements.toggleSidebarBtn.addEventListener("click", toggleSidebar);
  }
  if (elements.closeSidebarBtn) {
    elements.closeSidebarBtn.addEventListener("click", closeSidebar);
  }

  // Detail Modal Close Button & Backdrop Click
  if (elements.closeModalBtn) {
    elements.closeModalBtn.addEventListener("click", closeDetailModal);
  }
  if (elements.detailModalBackdrop) {
    elements.detailModalBackdrop.addEventListener("click", (e) => {
      if (e.target === elements.detailModalBackdrop) {
        closeDetailModal();
      }
    });
  }

  // Close modal on Escape keyboard key (Accessibility WCAG AA)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && elements.detailModalBackdrop && !elements.detailModalBackdrop.hidden) {
      closeDetailModal();
    }
  });
}

/**
 * Switches the active application view between "map" (Map & Car Parks) and "feedback" (Disqus feedback).
 * @param {'map' | 'feedback'} tabName
 */
function switchMainTab(tabName) {
  if (tabName === "map") {
    if (elements.tabBtnMap) {
      elements.tabBtnMap.classList.add("active");
      elements.tabBtnMap.setAttribute("aria-selected", "true");
    }
    if (elements.tabBtnFeedback) {
      elements.tabBtnFeedback.classList.remove("active");
      elements.tabBtnFeedback.setAttribute("aria-selected", "false");
    }
    if (elements.mainContent) {
      elements.mainContent.hidden = false;
    }
    if (elements.tabViewFeedback) {
      elements.tabViewFeedback.hidden = true;
    }
    // Re-measure Leaflet map container to prevent rendering glitches
    if (state.leafMap) {
      setTimeout(() => {
        state.leafMap.invalidateSize();
      }, 60);
    }
  } else if (tabName === "feedback") {
    if (elements.tabBtnFeedback) {
      elements.tabBtnFeedback.classList.add("active");
      elements.tabBtnFeedback.setAttribute("aria-selected", "true");
    }
    if (elements.tabBtnMap) {
      elements.tabBtnMap.classList.remove("active");
      elements.tabBtnMap.setAttribute("aria-selected", "false");
    }
    if (elements.mainContent) {
      elements.mainContent.hidden = true;
    }
    if (elements.tabViewFeedback) {
      elements.tabViewFeedback.hidden = false;
    }
    // Trigger Disqus load / reset if available
    loadOrRefreshDisqus();
  }
}

/**
 * Loads or resets the Disqus discussion thread safely.
 */
function loadOrRefreshDisqus() {
  try {
    if (window.DISQUS) {
      window.DISQUS.reset({
        reload: true,
        config: function () {
          this.page.url = window.location.origin + window.location.pathname;
          this.page.identifier = "carpark-finder-singapore-feedback";
        }
      });
    } else if (!document.getElementById("disqus-embed-script")) {
      const d = document, s = d.createElement("script");
      s.id = "disqus-embed-script";
      s.src = "https://carpark-finder.disqus.com/embed.js";
      s.setAttribute("data-timestamp", String(+new Date()));
      s.async = true;
      (d.head || d.body).appendChild(s);
    }
  } catch (err) {
    console.warn("Disqus load note:", err);
  }
}

/**
 * Initializes and renders the Singapore OneMap (SLA) via Leaflet.
 */
function initOneMap() {
  if (!elements.mapContainer) return;

  // Check if Leaflet library is available
  if (typeof L === "undefined") {
    // Retry shortly if script is still loading
    setTimeout(initOneMap, 150);
    return;
  }

  // If map already instantiated, update view
  if (state.leafMap) {
    state.leafMap.setView([state.userLocation.lat, state.userLocation.lng], getZoomLevelForRadius(state.radiusKm));
    return;
  }

  // Singapore geographic bounds
  const sgSouthWest = L.latLng(1.15, 103.55);
  const sgNorthEast = L.latLng(1.48, 104.10);
  const sgBounds = L.latLngBounds(sgSouthWest, sgNorthEast);

  // Instantiate Leaflet Map centered at target location
  state.leafMap = L.map(elements.mapContainer, {
    center: [state.userLocation.lat, state.userLocation.lng],
    zoom: getZoomLevelForRadius(state.radiusKm),
    minZoom: 11,
    maxZoom: 19,
    maxBounds: sgBounds,
    zoomControl: false,
    attributionControl: true
  });

  // Add custom zoom control at bottom right
  L.control.zoom({ position: "bottomright" }).addTo(state.leafMap);

  // SLA OneMap Official Raster Tile Service (Default theme)
  const oneMapDefaultLayer = L.tileLayer("https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png", {
    minZoom: 11,
    maxZoom: 19,
    bounds: sgBounds,
    attribution: '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:14px;vertical-align:middle;margin-right:4px;" alt="OneMap"/> OneMap | &copy; Singapore Land Authority'
  });

  oneMapDefaultLayer.addTo(state.leafMap);

  // Add Search Radius visual circle overlay
  state.radiusCircle = L.circle([state.userLocation.lat, state.userLocation.lng], {
    color: "#2563eb",
    fillColor: "#2563eb",
    fillOpacity: 0.08,
    weight: 2,
    radius: state.radiusKm * 1000 // Convert km to meters
  }).addTo(state.leafMap);

  // Add Glowing User GPS / Target Location Pin
  const userPinHtml = '<div class="onemap-user-pin" title="Current Search Target Location"></div>';
  const userIcon = L.divIcon({
    className: "onemap-user-pin-wrapper",
    html: userPinHtml,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  state.userMarker = L.marker([state.userLocation.lat, state.userLocation.lng], {
    icon: userIcon,
    zIndexOffset: 1000
  }).addTo(state.leafMap);

  // Fix map sizing after render
  setTimeout(() => {
    if (state.leafMap) state.leafMap.invalidateSize();
  }, 200);

  // Render initial car park markers
  renderCarParkMarkersOnMap();
}

/**
 * Handles live typing in the OneMap Search input.
 * Debounces calls to the OneMap Elastic Search API.
 */
function handleOneMapSearchInput(e) {
  const query = e.target.value.trim();

  // Show or hide clear button
  if (elements.clearSearchBtn) {
    elements.clearSearchBtn.hidden = query.length === 0;
  }

  if (state.searchDebounceTimer) {
    clearTimeout(state.searchDebounceTimer);
  }

  if (query.length < 2) {
    state.searchResults = [];
    if (elements.onemapSearchDropdown) {
      elements.onemapSearchDropdown.hidden = true;
      elements.onemapSearchDropdown.innerHTML = "";
    }
    return;
  }

  // Show loading in dropdown
  if (elements.onemapSearchDropdown) {
    elements.onemapSearchDropdown.hidden = false;
    elements.onemapSearchDropdown.innerHTML = `
      <div class="onemap-search-loading">
        Searching OneMap for "<strong>${escapeHtml(query)}</strong>"...
      </div>
    `;
  }

  state.searchDebounceTimer = setTimeout(() => {
    executeOneMapSearch(query);
  }, 200);
}

/**
 * Calls backend `/api/onemap/search` or `/api/insight?action=search` to fetch real-time Singapore geocoding results.
 */
async function executeOneMapSearch(query, autoSelectFirst = false) {
  try {
    let results = [];
    // 1. Try dedicated proxy endpoint
    try {
      const response = await fetch(`/api/onemap/search?searchVal=${encodeURIComponent(query)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`);
      if (response.ok) {
        const data = await response.json();
        results = Array.isArray(data.results) ? data.results : [];
      }
    } catch (e) {
      console.warn("Primary OneMap search route failed, trying fallback...", e);
    }

    // 2. Fallback to insight search endpoint if empty
    if (results.length === 0) {
      try {
        const fbResponse = await fetch(`/api/insight?action=search&searchVal=${encodeURIComponent(query)}`);
        if (fbResponse.ok) {
          const fbData = await fbResponse.json();
          results = Array.isArray(fbData.results) ? fbData.results : [];
        }
      } catch (e2) {
        console.warn("Fallback search route error:", e2);
      }
    }

    state.searchResults = results;
    state.activeSearchIndex = -1;

    if (autoSelectFirst && results.length > 0) {
      selectOneMapSearchResult(results[0]);
      return;
    }

    renderOneMapSearchResults(results, query);
  } catch (err) {
    console.error("OneMap search error:", err);
    if (elements.onemapSearchDropdown) {
      elements.onemapSearchDropdown.innerHTML = `
        <div class="onemap-search-empty">
          No matches found on OneMap. Try searching a building, street, or postal code.
        </div>
      `;
    }
  }
}

/**
 * Renders the list of OneMap location search suggestions in the dropdown.
 */
function renderOneMapSearchResults(results, query) {
  if (!elements.onemapSearchDropdown) return;

  if (results.length === 0) {
    elements.onemapSearchDropdown.innerHTML = `
      <div class="onemap-search-empty">
        No locations found for "<strong>${escapeHtml(query)}</strong>"
      </div>
    `;
    elements.onemapSearchDropdown.hidden = false;
    return;
  }

  const html = results.slice(0, 8).map((item, idx) => {
    const rawBuilding = item.building || item.BUILDING;
    const building = rawBuilding && rawBuilding !== "NIL" ? rawBuilding : "";
    const rawSearchVal = item.searchVal || item.SEARCHVAL || "";
    const address = item.address || item.ADDRESS || "";
    const title = building || rawSearchVal || address || "Location";

    const rawRoad = item.road || item.roadName || item.ROAD_NAME;
    const road = rawRoad && rawRoad !== "NIL" ? rawRoad : "";
    const sub = [road, address].filter(Boolean).join(", ") || "Singapore";

    const rawPostal = item.postal || item.POSTAL;
    const postalVal = rawPostal && rawPostal !== "NIL" ? rawPostal : "";
    const postal = postalVal ? `<span class="onemap-postal-badge">S(${postalVal})</span>` : "";

    return `
      <div
        class="onemap-search-item"
        data-index="${idx}"
        role="option"
        id="onemap-opt-${idx}"
      >
        <div class="onemap-search-item-title">
          <span>${escapeHtml(title)}</span>
          ${postal}
        </div>
        <div class="onemap-search-item-sub">${escapeHtml(sub)}</div>
      </div>
    `;
  }).join("");

  elements.onemapSearchDropdown.innerHTML = html;
  elements.onemapSearchDropdown.hidden = false;

  // Attach click listeners to each suggestion
  const items = elements.onemapSearchDropdown.querySelectorAll(".onemap-search-item");
  items.forEach((itemEl) => {
    itemEl.addEventListener("click", () => {
      const idx = parseInt(itemEl.dataset.index, 10);
      selectOneMapSearchResult(state.searchResults[idx]);
    });
  });
}

/**
 * Handles keyboard navigation (ArrowUp, ArrowDown, Enter, Escape) in the search dropdown.
 */
function handleOneMapSearchKeyDown(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    if (elements.onemapSearchDropdown && !elements.onemapSearchDropdown.hidden && state.activeSearchIndex >= 0 && state.activeSearchIndex < state.searchResults.length) {
      selectOneMapSearchResult(state.searchResults[state.activeSearchIndex]);
    } else if (state.searchResults.length > 0) {
      selectOneMapSearchResult(state.searchResults[0]);
    } else {
      const query = elements.onemapSearchInput ? elements.onemapSearchInput.value.trim() : "";
      if (query.length >= 2) {
        executeOneMapSearch(query, true);
      }
    }
    return;
  }

  if (!elements.onemapSearchDropdown || elements.onemapSearchDropdown.hidden) return;

  const items = elements.onemapSearchDropdown.querySelectorAll(".onemap-search-item");
  if (items.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    state.activeSearchIndex = (state.activeSearchIndex + 1) % items.length;
    updateActiveSearchItem(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    state.activeSearchIndex = (state.activeSearchIndex - 1 + items.length) % items.length;
    updateActiveSearchItem(items);
  } else if (e.key === "Escape") {
    elements.onemapSearchDropdown.hidden = true;
  }
}

/**
 * Updates visual highlight of the active search item during arrow key navigation.
 */
function updateActiveSearchItem(items) {
  items.forEach((item, idx) => {
    if (idx === state.activeSearchIndex) {
      item.classList.add("active");
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("active");
    }
  });
}

/**
 * Selects a location from OneMap search and centers the map & radius.
 */
function selectOneMapSearchResult(item) {
  if (!item) return;

  const lat = parseFloat(item.lat || item.LATITUDE);
  const lng = parseFloat(item.lng || item.LONGITUDE);

  if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

  state.userLocation = { lat, lng };

  const rawBuilding = item.building || item.BUILDING;
  const building = rawBuilding && rawBuilding !== "NIL" ? rawBuilding : "";
  const rawRoad = item.road || item.roadName || item.ROAD_NAME;
  const road = rawRoad && rawRoad !== "NIL" ? rawRoad : "";
  const rawSearchVal = item.searchVal || item.SEARCHVAL || "";
  const rawAddress = item.address || item.ADDRESS || "";

  const locName = building || rawSearchVal || road || rawAddress || "Selected Location";

  if (elements.onemapSearchInput) {
    elements.onemapSearchInput.value = locName;
  }

  if (elements.clearSearchBtn) {
    elements.clearSearchBtn.hidden = false;
  }

  if (elements.onemapSearchDropdown) {
    elements.onemapSearchDropdown.hidden = true;
  }

  updateLocationDisplayText(`${locName} (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`);
  updateMapCenterAndRadius();
  fetchCarParkData();
}

/**
 * Clears the OneMap search input.
 */
function handleClearSearch() {
  if (elements.onemapSearchInput) {
    elements.onemapSearchInput.value = "";
    elements.onemapSearchInput.focus();
  }
  if (elements.clearSearchBtn) {
    elements.clearSearchBtn.hidden = true;
  }
  if (elements.onemapSearchDropdown) {
    elements.onemapSearchDropdown.hidden = true;
    elements.onemapSearchDropdown.innerHTML = "";
  }
  state.searchResults = [];
}

/**
 * Requests the user's current GPS geolocation via the standard Browser Geolocation API.
 * If granted, centers the map and updates the car park search radius accordingly.
 */
function requestUserGeolocation() {
  if (!navigator.geolocation) {
    updateLocationDisplayText("Singapore CBD (City Hall)");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      // Verify the coordinate is roughly within Singapore bounding box
      if (lat >= 1.15 && lat <= 1.48 && lng >= 103.55 && lng <= 104.10) {
        state.userLocation = { lat, lng };
        updateLocationDisplayText(`My Location (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`);
      } else {
        // Outside Singapore, default to Singapore CBD with custom user position indicator
        state.userLocation = { lat: 1.290270, lng: 103.851959 };
        updateLocationDisplayText("Singapore CBD (1.2903° N, 103.8520° E)");
      }

      updateMapCenterAndRadius();
      fetchCarParkData();
    },
    (error) => {
      console.info("Geolocation notice:", error.message);
      updateLocationDisplayText("Singapore CBD (City Hall)");
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

/**
 * Updates the text displayed in the header showing the current target location.
 * 
 * @param {string} locationText - Description of the current target area or coordinates
 */
function updateLocationDisplayText(locationText) {
  if (elements.locationDisplayText) {
    elements.locationDisplayText.textContent = `Target: ${locationText}`;
  }
}

/**
 * Updates map center, user location marker, and radius circle.
 */
function updateMapCenterAndRadius() {
  if (!state.leafMap) return;

  state.leafMap.setView([state.userLocation.lat, state.userLocation.lng], getZoomLevelForRadius(state.radiusKm), {
    animate: true,
    duration: 0.5
  });

  if (state.userMarker) {
    state.userMarker.setLatLng([state.userLocation.lat, state.userLocation.lng]);
  }

  if (state.radiusCircle) {
    state.radiusCircle.setLatLng([state.userLocation.lat, state.userLocation.lng]);
    state.radiusCircle.setRadius(state.radiusKm * 1000);
  }
}

/**
 * Calculates optimal OneMap zoom level based on the radius in kilometers.
 * 
 * @param {number} radiusKm - Radius in kilometers
 * @returns {number} Appropriate zoom level (13 to 16)
 */
function getZoomLevelForRadius(radiusKm) {
  if (radiusKm <= 1.2) return 16;
  if (radiusKm <= 2.2) return 15;
  return 14;
}

/**
 * Updates the radius circle overlay on the OneMap when the slider changes.
 */
function updateRadiusCircle() {
  if (state.radiusCircle) {
    state.radiusCircle.setRadius(state.radiusKm * 1000);
  }
  if (state.leafMap) {
    state.leafMap.setZoom(getZoomLevelForRadius(state.radiusKm));
  }
}

/**
 * Fetches real-time car park lot availability from the backend serverless API `/api/insight`.
 * Validates responses and updates the UI and Map markers accordingly.
 */
async function fetchCarParkData() {
  if (state.isFetching) return;
  state.isFetching = true;

  // Update refresh indicator spinner state
  if (elements.refreshSpinner) {
    elements.refreshSpinner.classList.remove("paused");
  }

  const queryParams = new URLSearchParams({
    lat: state.userLocation.lat.toString(),
    lng: state.userLocation.lng.toString(),
    radius: state.radiusKm.toString(),
    evOnly: state.evFilterOnly ? "true" : "false"
  });

  try {
    const response = await fetch(`/api/insight?${queryParams.toString()}`);
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    if (data.success && Array.isArray(data.carparks)) {
      state.carparks = data.carparks;
      renderCarParksList(data.carparks, data.stats);
      renderCarParkMarkersOnMap();
      resetCountdownTimer();
    }
  } catch (error) {
    console.error("Error fetching car park data:", error);
    if (elements.resultsSummaryText) {
      elements.resultsSummaryText.textContent = "Unable to connect to server. Retrying...";
    }
  } finally {
    state.isFetching = false;
  }
}

/**
 * Renders custom colored car park markers on the OneMap Leaflet map.
 * Applies color coding rules:
 * - Red: < 5 lots
 * - Orange: < 10 lots (5 to 9)
 * - Green: >= 10 lots
 */
function renderCarParkMarkersOnMap() {
  if (!state.leafMap || typeof L === "undefined") {
    renderFallbackMapCanvas();
    return;
  }

  // Clear existing car park markers from the map
  state.carparkMarkers.forEach((m) => {
    if (state.leafMap) state.leafMap.removeLayer(m);
  });
  state.carparkMarkers = [];

  state.carparks.forEach((cp) => {
    // Determine pin color class: red (< 5), orange (< 10), green (>= 10)
    let pinColorClass = "pin-green";
    let pinColorHex = "#10b981";
    if (cp.availableLots < 5) {
      pinColorClass = "pin-red";
      pinColorHex = "#f43f5e";
    } else if (cp.availableLots < 10) {
      pinColorClass = "pin-orange";
      pinColorHex = "#f59e0b";
    }

    const lotsDisplay = cp.availableLots > 99 ? "99+" : String(cp.availableLots);
    const evIconHtml = cp.hasEV ? '<div class="onemap-ev-badge-icon" title="EV Charging Station Available">⚡</div>' : "";

    const markerHtml = `
      <div class="onemap-carpark-pin ${pinColorClass}" style="width:36px;height:24px;">
        ${lotsDisplay}
        ${evIconHtml}
      </div>
    `;

    const customIcon = L.divIcon({
      className: "onemap-carpark-marker-wrapper",
      html: markerHtml,
      iconSize: [36, 24],
      iconAnchor: [18, 12]
    });

    const marker = L.marker([cp.lat, cp.lng], { icon: customIcon });

    // Popup card content
    const evTagHtml = cp.hasEV
      ? `<div style="margin-top:4px;margin-bottom:8px;padding:3px 8px;background:#dbeafe;color:#1d4ed8;border-radius:4px;font-size:11px;font-weight:700;display:inline-block;">⚡ EV CHARGING AVAILABLE</div>`
      : "";

    const popupHtml = `
      <div class="onemap-popup-card">
        <div class="onemap-popup-title">${escapeHtml(cp.name)}</div>
        <div class="onemap-popup-sub">${escapeHtml(cp.area)} &bull; ${cp.distanceKm} km away</div>
        <div>
          <span class="onemap-popup-lots" style="background-color:${pinColorHex};">
            ${cp.availableLots} Lots Available (${cp.lotType})
          </span>
        </div>
        ${evTagHtml}
        <button type="button" class="onemap-popup-btn" id="onemap-popup-btn-${cp.id}">
          View Details &amp; Rates
        </button>
      </div>
    `;

    marker.bindPopup(popupHtml, { maxWidth: 260, offset: [0, -10] });

    marker.on("popupopen", () => {
      const btn = document.getElementById(`onemap-popup-btn-${cp.id}`);
      if (btn) {
        btn.onclick = () => openDetailModal(cp);
      }
    });

    marker.addTo(state.leafMap);
    state.carparkMarkers.push(marker);
  });
}

/**
 * Escapes HTML characters to prevent XSS.
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Renders an interactive Fallback Map Canvas if the OneMap map service is offline or initializing.
 * Plots user position, radius circle, and colored car park nodes.
 */
function renderFallbackMapCanvas() {
  if (!elements.mapContainer) return;
  if (elements.mapContainer.querySelector("canvas")) return;

  const canvas = document.createElement("canvas");
  canvas.id = "fallback-map-canvas";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.backgroundColor = "#e8eaed";
  elements.mapContainer.innerHTML = "";
  elements.mapContainer.appendChild(canvas);

  drawFallbackCanvas();
  window.addEventListener("resize", drawFallbackCanvas);
}

/**
 * Draws coordinate nodes and radius on the 2D HTML5 canvas when OneMap Leaflet is not yet mounted.
 */
function drawFallbackCanvas() {
  const canvas = document.getElementById("fallback-map-canvas");
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio || 800;
  canvas.height = rect.height * window.devicePixelRatio || 600;

  const ctx = canvas.getContext("2d");
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const width = rect.width;
  const height = rect.height;
  const centerX = width / 2;
  const centerY = height / 2;

  // Clear background
  ctx.fillStyle = "#f1f3f4";
  ctx.fillRect(0, 0, width, height);

  // Draw Grid lines
  ctx.strokeStyle = "#dadce0";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw Radius Circle (Scaled to pixels)
  const pixelRadius = (state.radiusKm / 3.0) * (Math.min(width, height) * 0.4);
  ctx.fillStyle = "rgba(11, 87, 208, 0.08)";
  ctx.strokeStyle = "#0b57d0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, pixelRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw User Location Center Dot
  ctx.fillStyle = "rgba(26, 115, 232, 0.25)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a73e8";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 7, 0, Math.PI * 2);
  ctx.fill();

  // Plot Car Park Markers
  state.carparks.forEach((cp, idx) => {
    // Relative coordinate offset from center
    const dLat = (cp.lat - state.userLocation.lat) * 111; // ~km
    const dLng = (cp.lng - state.userLocation.lng) * 111; // ~km
    const scaleFactor = (Math.min(width, height) * 0.4) / 3.0;

    const posX = centerX + dLng * scaleFactor;
    const posY = centerY - dLat * scaleFactor;

    // Pin color based on lots count
    ctx.fillStyle = cp.colorHex || (cp.availableLots < 5 ? "#d93025" : cp.availableLots < 10 ? "#e37400" : "#1e8e3e");
    ctx.beginPath();
    ctx.arc(posX, posY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Lots text inside node
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(cp.availableLots), posX, posY);
  });
}

/**
 * Renders the list of nearby car parks in the sidebar drawer.
 * 
 * @param {Array} carparks - List of car park objects
 * @param {object} stats - Summary statistical counts
 */
function renderCarParksList(carparks, stats) {
  if (!elements.carparksList) return;

  // Update Results Header Summary
  if (elements.resultsCountTitle) {
    elements.resultsCountTitle.textContent = `${carparks.length} Car Parks Found`;
  }
  if (elements.resultsSummaryText) {
    const evText = state.evFilterOnly ? " (EV only)" : "";
    elements.resultsSummaryText.textContent = `Within ${state.radiusKm} km radius${evText} &bull; ${stats?.totalLots || 0} total lots`;
  }

  // Handle empty state
  if (carparks.length === 0) {
    elements.carparksList.innerHTML = `
      <div style="text-align:center;padding:32px 16px;color:#5f6368;">
        <svg viewBox="0 0 24 24" width="48" height="48" style="color:#9aa0a6;margin-bottom:12px;">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
        </svg>
        <h3 style="font-size:16px;font-weight:700;color:#1f1f1f;margin-bottom:4px;">No Car Parks Found</h3>
        <p style="font-size:14px;">Try expanding your search radius using the slider below (up to 3.0 km).</p>
      </div>
    `;
    return;
  }

  // Build HTML for each car park card
  const cardsHtml = carparks
    .map((cp) => {
      const evBadge = cp.hasEV
        ? `<span class="ev-badge-chip" aria-label="Has EV Charging">
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
            EV Charging
          </span>`
        : "";

      return `
        <article
          class="carpark-item-card"
          id="card-${cp.id}"
          tabindex="0"
          role="article"
          aria-label="${cp.ariaLabel}"
          data-carpark-id="${cp.id}"
        >
          <div class="card-top-row">
            <div>
              <h3 class="card-name">${cp.name}</h3>
              <p class="card-area">${cp.area} &bull; ${cp.distanceKm} km away</p>
            </div>
            <span class="badge-pill ${cp.badgeClass}">
              ${cp.availableLots} Lots
            </span>
          </div>

          <div class="card-meta-row">
            <span>${cp.agency} &bull; ${cp.lotType}</span>
            ${evBadge}
          </div>
        </article>
      `;
    })
    .join("");

  elements.carparksList.innerHTML = cardsHtml;

  // Attach click & keyboard listeners to each generated card
  carparks.forEach((cp) => {
    const cardEl = document.getElementById(`card-${cp.id}`);
    if (cardEl) {
      cardEl.addEventListener("click", () => openDetailModal(cp));
      cardEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDetailModal(cp);
        }
      });
    }
  });
}

/**
 * Handles real-time input on the radius range slider (1.0km - 3.0km).
 * Updates the displayed numeric value immediately while dragging.
 * 
 * @param {Event} e - Input slider event
 */
function handleRadiusSliderInput(e) {
  const newRadius = parseFloat(e.target.value);
  state.radiusKm = newRadius;
  if (elements.radiusValueText) {
    elements.radiusValueText.textContent = `${newRadius.toFixed(1)} km`;
  }
  updateRadiusCircle();
}

/**
 * Handles the change commit event when the user finishes adjusting the radius slider.
 * Triggers a fresh query to the backend API.
 */
function handleRadiusSliderChange() {
  fetchCarParkData();
}

/**
 * Toggles the EV Charging Filter state (All Lots vs. EV Charging Stations Only).
 */
function handleEVFilterToggle() {
  state.evFilterOnly = !state.evFilterOnly;

  if (elements.evToggleBtn) {
    elements.evToggleBtn.classList.toggle("active", state.evFilterOnly);
    elements.evToggleBtn.setAttribute("aria-checked", state.evFilterOnly ? "true" : "false");
  }

  if (elements.evToggleStatusText) {
    elements.evToggleStatusText.textContent = state.evFilterOnly ? "EV Only Active" : "All Lots";
  }

  fetchCarParkData();
}

/**
 * Handles district jump selector change (e.g. jumping to Orchard, Marina Bay, Jurong East).
 * 
 * @param {Event} e - Change event
 */
function handleDistrictSelectChange(e) {
  if (!e.target.value) return;
  const [latStr, lngStr] = e.target.value.split(",");
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (!isNaN(lat) && !isNaN(lng)) {
    state.userLocation = { lat, lng };
    const selectedOptionText = e.target.options[e.target.selectedIndex].text;
    
    if (elements.onemapSearchInput) {
      elements.onemapSearchInput.value = selectedOptionText;
    }
    if (elements.clearSearchBtn) {
      elements.clearSearchBtn.hidden = false;
    }

    updateLocationDisplayText(`${selectedOptionText} (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`);
    updateMapCenterAndRadius();
    fetchCarParkData();
  }
}

/**
 * Handles clicking the Locate Me GPS floating button.
 */
function handleLocateMeClick() {
  requestUserGeolocation();
}

/**
 * Handles clicking the Manual Refresh button.
 */
function handleManualRefreshClick() {
  fetchCarParkData();
}

/**
 * Starts the 1-minute auto-refresh countdown timer and interval polling.
 * Automatically refreshes car park availability every 60 seconds.
 */
function startOneMinuteRefreshTimer() {
  // Clear any existing intervals
  if (state.refreshIntervalId) clearInterval(state.refreshIntervalId);
  if (state.countdownIntervalId) clearInterval(state.countdownIntervalId);

  state.refreshSecondsRemaining = 60;

  // 1-second countdown tick for accessible visual feedback
  state.countdownIntervalId = setInterval(() => {
    state.refreshSecondsRemaining -= 1;
    if (state.refreshSecondsRemaining <= 0) {
      state.refreshSecondsRemaining = 60;
    }
    if (elements.refreshTimerText) {
      elements.refreshTimerText.textContent = `Refresh in ${state.refreshSecondsRemaining}s`;
    }
  }, 1000);

  // 60-second polling interval
  state.refreshIntervalId = setInterval(() => {
    fetchCarParkData();
  }, 60000);
}

/**
 * Resets the 1-minute countdown timer after a successful data refresh.
 */
function resetCountdownTimer() {
  state.refreshSecondsRemaining = 60;
  if (elements.refreshTimerText) {
    elements.refreshTimerText.textContent = "Refreshed just now";
  }
}

/**
 * Opens the Car Park Details modal popup dialog with rich EV and parking rate info.
 * 
 * @param {object} cp - Selected car park object
 */
function openDetailModal(cp) {
  if (!elements.detailModalBackdrop) return;

  if (elements.modalAgencyTag) elements.modalAgencyTag.textContent = cp.agency;
  if (elements.modalCarparkTitle) elements.modalCarparkTitle.textContent = cp.name;
  if (elements.modalCarparkArea) {
    elements.modalCarparkArea.textContent = `${cp.area} • ${cp.distanceKm} km from current target`;
  }

  // Determine lot status styling
  let statusBannerBg = "#e6f4ea";
  let statusBannerText = "#137333";
  let statusLabel = "High Availability";

  if (cp.availableLots < 5) {
    statusBannerBg = "#fce8e6";
    statusBannerText = "#c5221f";
    statusLabel = "Critically Low (< 5 Lots)";
  } else if (cp.availableLots < 10) {
    statusBannerBg = "#fef7e0";
    statusBannerText = "#b06000";
    statusLabel = "Limited Lots (< 10 Lots)";
  }

  // EV charging details section
  let evSectionHtml = `
    <div style="font-size:14px;color:#5f6368;">
      <h4 class="modal-section-title">EV Charging</h4>
      <p>No EV charging stations recorded at this facility.</p>
    </div>
  `;

  if (cp.hasEV && cp.evDetails) {
    const connectors = cp.evDetails.connectorTypes.join(", ");
    evSectionHtml = `
      <div>
        <h4 class="modal-section-title">⚡ EV Charging Network</h4>
        <div class="ev-info-box">
          <div><strong>Operator:</strong> ${cp.evDetails.operator}</div>
          <div><strong>Chargers:</strong> ${cp.evDetails.chargersCount} charging bays</div>
          <div><strong>Connectors:</strong> ${connectors}</div>
          <div><strong>Tariff:</strong> ${cp.evDetails.pricing}</div>
        </div>
      </div>
    `;
  }

  if (elements.modalCarparkBody) {
    elements.modalCarparkBody.innerHTML = `
      <div class="modal-lots-banner" style="background-color:${statusBannerBg};color:${statusBannerText};">
        <div>
          <div class="modal-lots-number">${cp.availableLots}</div>
          <div class="modal-lots-desc">Available Lots (${cp.lotType})</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700;font-size:14px;">${statusLabel}</div>
          <div style="font-size:12px;opacity:0.85;">Total: ${cp.totalLots} Lots</div>
        </div>
      </div>

      <div>
        <h4 class="modal-section-title">Parking Rates &amp; Charges</h4>
        <div class="rate-info-box">
          <p>${cp.rate}</p>
        </div>
      </div>

      ${evSectionHtml}
    `;
  }

  // Navigation Directions external link
  if (elements.modalNavigateBtn) {
    elements.modalNavigateBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${cp.lat},${cp.lng}`;
  }

  // Show modal and focus close button for accessibility
  elements.detailModalBackdrop.hidden = false;
  if (elements.closeModalBtn) {
    elements.closeModalBtn.focus();
  }
}

/**
 * Closes the Car Park Details modal popup dialog.
 */
function closeDetailModal() {
  if (elements.detailModalBackdrop) {
    elements.detailModalBackdrop.hidden = true;
  }
}

/**
 * Toggles the mobile car parks sidebar list view.
 */
function toggleSidebar() {
  if (!elements.carparksSidebar) return;
  const isOpen = elements.carparksSidebar.classList.toggle("open");
  if (elements.toggleSidebarBtn) {
    elements.toggleSidebarBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }
}

/**
 * Closes the mobile car parks sidebar list view.
 */
function closeSidebar() {
  if (!elements.carparksSidebar) return;
  elements.carparksSidebar.classList.remove("open");
  if (elements.toggleSidebarBtn) {
    elements.toggleSidebarBtn.setAttribute("aria-expanded", "false");
  }
}

// Kick off application on DOM readiness
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApplication);
} else {
  initApplication();
}
