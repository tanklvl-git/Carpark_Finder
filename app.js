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
  googleMap: null, // Google Map instance
  radiusCircle: null, // Google Maps Circle overlay for radius visualization
  userMarker: null, // Google Maps Marker for user's GPS position
  carparkMarkers: [], // Array of active car park map markers
  refreshIntervalId: null, // 1-Minute Interval Timer ID
  refreshSecondsRemaining: 60, // Countdown timer for 1-minute auto-refresh
  countdownIntervalId: null,
  isFetching: false,
  isGoogleMapsLoaded: false
};

// DOM Element References (Cached after DOM Content Loaded)
const elements = {
  mapContainer: null,
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
  setupAlertCard: null,
  dismissAlertBtn: null
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
  fetchCarParkData();
  loadGoogleMapsScript();
}

/**
 * Caches HTML element references from the DOM into a central object.
 * This avoids repeated document.getElementById calls for better performance.
 */
function cacheDOMElements() {
  elements.mapContainer = document.getElementById("google-map-container");
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
  elements.setupAlertCard = document.getElementById("setup-alert-card");
  elements.dismissAlertBtn = document.getElementById("dismiss-alert-btn");
}

/**
 * Attaches user interaction event listeners (Clicks, Slider input changes, Key presses).
 * No inline JavaScript (such as onclick="...") is used in the HTML markup.
 */
function setupEventListeners() {
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

  // Dismiss Alert Button
  if (elements.dismissAlertBtn) {
    elements.dismissAlertBtn.addEventListener("click", () => {
      if (elements.setupAlertCard) {
        elements.setupAlertCard.hidden = true;
      }
    });
  }

  // Close modal on Escape keyboard key (Accessibility WCAG AA)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !elements.detailModalBackdrop.hidden) {
      closeDetailModal();
    }
  });
}

/**
 * Dynamically loads the Google Maps JavaScript SDK via the secure backend proxy endpoint.
 * This keeps all private credentials on the server side.
 */
function loadGoogleMapsScript() {
  // Define global callback handler before inserting script tag
  window.initGoogleMap = function () {
    state.isGoogleMapsLoaded = true;
    renderGoogleMap();
  };

  const script = document.createElement("script");
  script.src = "/api/maps-js?callback=initGoogleMap";
  script.async = true;
  script.defer = true;
  script.onerror = function () {
    console.warn("Google Maps JS could not be loaded via proxy. Using interactive visual map canvas.");
    renderFallbackMapCanvas();
  };
  document.head.appendChild(script);
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

      if (state.googleMap) {
        state.googleMap.setCenter(state.userLocation);
        updateUserMapMarker();
        updateRadiusCircle();
      }
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
 * Initializes and renders the Google Map inside the map container.
 */
function renderGoogleMap() {
  if (!window.google || !window.google.maps || !elements.mapContainer) {
    return;
  }

  // Create Google Map instance centered at user's location
  state.googleMap = new google.maps.Map(elements.mapContainer, {
    center: state.userLocation,
    zoom: getZoomLevelForRadius(state.radiusKm),
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: true,
    styles: [
      { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      { featureType: "transit", elementType: "labels", stylers: [{ visibility: "simplified" }] }
    ]
  });

  // Create Radius visual circle overlay (Semi-transparent blue area)
  state.radiusCircle = new google.maps.Circle({
    strokeColor: "#0b57d0",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#0b57d0",
    fillOpacity: 0.08,
    map: state.googleMap,
    center: state.userLocation,
    radius: state.radiusKm * 1000 // Convert km to meters
  });

  // Create User GPS Position Marker (Glowing blue dot)
  renderUserLocationMarker();

  // Render Car Park Markers on the Map
  renderCarParkMarkersOnMap();
}

/**
 * Renders the glowing blue marker for the user's location on the Google Map.
 */
function renderUserLocationMarker() {
  if (!state.googleMap || !window.google) return;

  // Custom User Location Pin using SVG icon
  const userPinSvg = {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: "#1a73e8",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 3
  };

  if (state.userMarker) {
    state.userMarker.setPosition(state.userLocation);
  } else {
    state.userMarker = new google.maps.Marker({
      position: state.userLocation,
      map: state.googleMap,
      title: "Your Location",
      icon: userPinSvg,
      zIndex: 1000
    });
  }
}

/**
 * Calculates optimal Google Maps zoom level based on the radius in kilometers.
 * 
 * @param {number} radiusKm - Radius in kilometers
 * @returns {number} Appropriate Google Maps zoom level (14 to 16)
 */
function getZoomLevelForRadius(radiusKm) {
  if (radiusKm <= 1.2) return 15;
  if (radiusKm <= 2.2) return 14;
  return 13;
}

/**
 * Updates the user location marker and centers the map.
 */
function updateUserMapMarker() {
  if (state.userMarker) {
    state.userMarker.setPosition(state.userLocation);
  }
  if (state.radiusCircle) {
    state.radiusCircle.setCenter(state.userLocation);
  }
}

/**
 * Updates the radius circle overlay on the Google Map when the slider changes.
 */
function updateRadiusCircle() {
  if (state.radiusCircle) {
    state.radiusCircle.setRadius(state.radiusKm * 1000);
  }
  if (state.googleMap) {
    state.googleMap.setZoom(getZoomLevelForRadius(state.radiusKm));
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
 * Renders custom colored car park markers on the Google Map.
 * Applies color coding rules:
 * - Red: < 5 lots
 * - Orange: < 10 lots (5 to 9)
 * - Green: >= 10 lots
 */
function renderCarParkMarkersOnMap() {
  if (!state.googleMap || !window.google) {
    renderFallbackMapCanvas();
    return;
  }

  // Clear existing car park markers from the map
  state.carparkMarkers.forEach((m) => m.setMap(null));
  state.carparkMarkers = [];

  // Create an InfoWindow instance for marker clicks
  const infoWindow = new google.maps.InfoWindow();

  state.carparks.forEach((cp) => {
    // Determine pin color: red (< 5), orange (< 10), green (>= 10)
    let pinColor = "#10b981"; // Emerald green
    if (cp.availableLots < 5) {
      pinColor = "#f43f5e"; // Rose red
    } else if (cp.availableLots < 10) {
      pinColor = "#f59e0b"; // Amber orange
    }

    // Create custom SVG marker label and icon
    const markerIcon = {
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
      fillColor: pinColor,
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
      scale: 1.8,
      anchor: new google.maps.Point(12, 22),
      labelOrigin: new google.maps.Point(12, 9)
    };

    const marker = new google.maps.Marker({
      position: { lat: cp.lat, lng: cp.lng },
      map: state.googleMap,
      title: `${cp.name} (${cp.availableLots} lots)`,
      icon: markerIcon,
      label: {
        text: cp.availableLots > 99 ? "99+" : String(cp.availableLots),
        color: "#ffffff",
        fontSize: "11px",
        fontWeight: "bold"
      }
    });

    // Marker click event listener: opens InfoWindow & details
    marker.addListener("click", () => {
      const evTagHtml = cp.hasEV
        ? `<div style="margin-top:6px;padding:3px 8px;background:#dbeafe;color:#1d4ed8;border-radius:4px;font-size:11px;font-weight:700;display:inline-block;">⚡ EV CHARGING AVAILABLE</div>`
        : "";

      const contentString = `
        <div style="font-family:'Plus Jakarta Sans',sans-serif;padding:6px;max-width:240px;color:#0f172a;">
          <strong style="font-size:14px;color:#0f172a;display:block;margin-bottom:2px;">${cp.name}</strong>
          <div style="font-size:12px;color:#64748b;margin-bottom:6px;">${cp.area} &bull; ${cp.distanceKm} km away</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="background:${pinColor};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">
              ${cp.availableLots} Lots Available
            </span>
          </div>
          ${evTagHtml}
          <div style="margin-top:8px;">
            <button id="infowindow-btn-${cp.id}" style="background:#2563eb;color:#fff;border:none;padding:7px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;width:100%;">
              View Details &amp; Rates
            </button>
          </div>
        </div>
      `;

      infoWindow.setContent(contentString);
      infoWindow.open(state.googleMap, marker);

      // Attach click event to InfoWindow's dynamic button
      google.maps.event.addListenerOnce(infoWindow, "domready", () => {
        const btn = document.getElementById(`infowindow-btn-${cp.id}`);
        if (btn) {
          btn.addEventListener("click", () => openDetailModal(cp));
        }
      });
    });

    state.carparkMarkers.push(marker);
  });
}

/**
 * Renders an interactive Fallback Map Canvas if the Google Maps JavaScript API is offline or loading.
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
 * Draws coordinate nodes and radius on the 2D HTML5 canvas when Google Maps JS is not yet mounted.
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
  const [latStr, lngStr] = e.target.value.split(",");
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (!isNaN(lat) && !isNaN(lng)) {
    state.userLocation = { lat, lng };
    const selectedOptionText = e.target.options[e.target.selectedIndex].text;
    updateLocationDisplayText(selectedOptionText);

    if (state.googleMap) {
      state.googleMap.setCenter(state.userLocation);
      updateUserMapMarker();
      updateRadiusCircle();
    }
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

  // Google Maps Directions link
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
