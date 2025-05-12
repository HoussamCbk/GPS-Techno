// Importation des modules Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCdlHjmlQvCLlr_JHENfPP94TPlz8cqw0o",
    authDomain: "gps-techno.firebaseapp.com",
    databaseURL: "https://gps-techno-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "gps-techno",
    storageBucket: "gps-techno.firebasestorage.app",
    messagingSenderId: "497925512665",
    appId: "1:497925512665:web:4e5288bfe0cc5e6f85cdc8",
    measurementId: "G-JYS8TJCQ9T"
  };

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Initialisation de la carte
const map = L.map('mapid').setView([0, 0], 2); // Vue initiale

// Ajout du fond de carte OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Polyline pour la trajectoire
let path = [];
let polyline = L.polyline(path, { color: 'blue' }).addTo(map);

// Marqueur pour la position actuelle
let marker = null;

// Référence à la base de données Firebase
const gpsRef = ref(database, 'gps');

// Helper: Get city from latitude and longitude using Nominatim API
async function fetchCityFromCoords(lat, lon) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`);
    if (!response.ok) return '-';
    const data = await response.json();
    // Try to get city, town, or village
    return data.address.city || data.address.town || data.address.village || data.address.hamlet || data.address.county || '-';
  } catch {
    return '-';
  }
}

// --- Distance Calculation ---
function calculateTotalDistance(coords) {
  if (!coords || coords.length < 2) return 0;
  let d = 0;
  for (let i = 1; i < coords.length; i++) {
    d += map.distance(coords[i - 1], coords[i]) / 1000; // in km
  }
  return d.toFixed(2);
}

// --- Map Type Switcher ---
const tileLayers = {
  streets: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }),
  satellite: L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France'
  }),
  terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)'
  })
};
let currentLayer = tileLayers.streets;
map.eachLayer(l => map.removeLayer(l));
tileLayers.streets.addTo(map);

document.getElementById('map-type').addEventListener('change', (e) => {
  map.removeLayer(currentLayer);
  currentLayer = tileLayers[e.target.value];
  currentLayer.addTo(map);
  polyline.addTo(map);
  if (marker) marker.addTo(map);
  customMarkers.forEach(m => m.addTo(map));
});

// --- Custom Markers ---
let customMarkers = [];
document.getElementById('add-marker').addEventListener('click', () => {
  map.once('click', async function(e) {
    const choice = prompt('Entrez une note pour ce marqueur ou tapez "Point B" pour définir une destination :');
    if (choice !== null) {
      const m = L.marker(e.latlng).addTo(map).bindPopup(choice);
      customMarkers.push(m);
      if (choice.trim().toLowerCase() === 'point b') {
        // Calculate route from current position to Point B
        if (path.length > 0) {
          const start = path[path.length - 1];
          const end = [e.latlng.lat, e.latlng.lng];
          const dist = haversineDistance(start[0], start[1], end[0], end[1]);
          // Draw green line for straight route
          if (window.straightRouteLine) map.removeLayer(window.straightRouteLine);
          window.straightRouteLine = L.polyline([start, end], { color: 'green', weight: 4, dashArray: '6 8' }).addTo(map);
          alert(`Distance à vol d'oiseau vers Point B : ${dist} km`);
        } else {
          alert('Position actuelle inconnue.');
        }
      }
    }
  });
  alert('Cliquez sur la carte pour placer le marqueur.');
});

document.getElementById('delete-marker').addEventListener('click', () => {
  if (customMarkers.length > 0) {
    const m = customMarkers.pop();
    // If the marker is Point B, remove the green line
    if (m.getPopup() && m.getPopup().getContent().trim().toLowerCase() === 'point b') {
      if (window.straightRouteLine) {
        map.removeLayer(window.straightRouteLine);
        window.straightRouteLine = null;
      }
    }
    map.removeLayer(m);
  } else {
    alert('Aucun marqueur à supprimer.');
  }
});

// --- Red marker for current location and live location button ---
let liveMode = true;
let currentMarker = null;

function updateCurrentMarker(pos) {
  if (currentMarker) {
    currentMarker.setLatLng(pos);
  } else {
    currentMarker = L.marker(pos, {icon: L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })}).addTo(map).bindPopup('Position actuelle');
  }
}

// Add live location button
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.createElement('button');
  btn.id = 'live-location-btn';
  btn.textContent = 'Retour à la position en direct';
  btn.className = 'leaflet-control custom-live-btn';
  document.getElementById('mapid').appendChild(btn);
  btn.style.display = 'block'; // Always show the button
  btn.addEventListener('click', () => {
    liveMode = true;
    if (path.length > 0) {
      map.setView(path[path.length - 1], 15);
    }
    // No longer hide the button
  });
});

// Update map on user move
map.on('movestart', () => {
  if (liveMode) {
    liveMode = false;
    const btn = document.getElementById('live-location-btn');
    if (btn) btn.style.display = 'block';
  }
});

// --- Routing and ETA ---
async function showRouteAndTime(start, end) {
  // OpenRouteService API (get your free API key at https://openrouteservice.org/)
  const apiKey = '5b3ce3597851110001cf6248476eaa278a944253b2f4141b1c30312c'; // Replace with your real API key
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}`;
  const body = {
    coordinates: [
      [start[1], start[0]], // [lng, lat]
      [end[1], end[0]]
    ]
  };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error('Erreur de calcul d’itinéraire');
    const data = await response.json();
    const routeCoords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
    const duration = data.features[0].properties.summary.duration; // in seconds
    const distance = data.features[0].properties.summary.distance; // in meters
    // Draw route
    if (window.routeLine) map.removeLayer(window.routeLine);
    window.routeLine = L.polyline(routeCoords, { color: 'red', weight: 5, dashArray: '8 8' }).addTo(map);
    // Show ETA
    const mins = Math.round(duration / 60);
    const distKm = (distance / 1000).toFixed(2);
    alert(`Itinéraire vers Point B :\nDistance : ${distKm} km\nDurée estimée : ${mins} min`);
  } catch (e) {
    alert('Impossible de calculer l’itinéraire.');
  }
}

// --- Historical Data ---
document.getElementById('load-history').addEventListener('click', () => {
  const date = document.getElementById('date-picker').value;
  if (!date) return alert('Sélectionnez une date.');
  // Suppose your Firebase structure is gps/YYYY-MM-DD/...
  const historyRef = ref(database, 'gps/' + date);
  onValue(historyRef, (snapshot) => {
    const data = snapshot.val();
    let histPath = [];
    if (data) {
      Object.values(data).forEach(point => {
        if (point.lat && point.lon) {
          histPath.push([point.lat, point.lon]);
        }
      });
    }
    polyline.setLatLngs(histPath);
    if (histPath.length > 0) {
      map.setView(histPath[histPath.length - 1], 15);
      if (marker) marker.setLatLng(histPath[histPath.length - 1]);
    }
    document.getElementById('distance').textContent = calculateTotalDistance(histPath);
  }, { onlyOnce: true });
});

// Écoute des changements de données GPS (ajout, modification, suppression)
onValue(gpsRef, async (snapshot) => {
  const data = snapshot.val();
  console.log("Received data from Firebase:", data); // Debug line
  path = [];
  if (data) {
    // data is an object with keys for each GPS point
    Object.values(data).forEach(point => {
      if (point.lat && point.lon) {
        path.push([point.lat, point.lon]);
      }
    });
    if (path.length > 0) {
      const lastPoint = path[path.length - 1];
      const lastData = data[Object.keys(data)[Object.keys(data).length - 1]];
      // Mise à jour des infos à l'écran
      console.log("Updating info section with:", lastPoint);
      document.getElementById('lat').textContent = lastPoint[0];
      document.getElementById('lng').textContent = lastPoint[1];
      document.getElementById('time').textContent = lastData.time || new Date().toLocaleTimeString();
      const dateValue = lastData.date || new Date().toLocaleDateString();
      document.getElementById('date').textContent = dateValue;
      document.getElementById('altitude').textContent = lastData.altitude !== undefined ? lastData.altitude : '-';
      document.getElementById('satellites').textContent = lastData.satellites !== undefined ? lastData.satellites : '-';
      document.getElementById('distance').textContent = calculateTotalDistance(path);
      
      polyline.setLatLngs(path);
      if (marker) {
        marker.setLatLng(lastPoint);
      } else {
        marker = L.marker(lastPoint).addTo(map);
      }
      updateCurrentMarker(lastPoint);
      if (liveMode) map.setView(lastPoint, 15);
      if (isMobile()) updateInfoCarousel();
    }
  }
});

// Info carousel for mobile
function updateInfoCarousel() {
  const info = document.getElementById('info');
  if (!info) return;
  const lat = document.getElementById('lat').textContent;
  const lng = document.getElementById('lng').textContent;
  const city = document.getElementById('city').textContent;
  const time = document.getElementById('time').textContent;
  const date = document.getElementById('date').textContent;
  info.innerHTML = `
    <div class="info-card" id="card-lat"><strong>Latitude</strong><span>${lat}</span></div>
    <div class="info-card" id="card-lng"><strong>Longitude</strong><span>${lng}</span></div>
    <div class="info-card" id="card-city"><strong>Ville</strong><span>${city}</span></div>
    <div class="info-card" id="card-time"><strong>Heure</strong><span>${time}</span></div>
    <div class="info-card" id="card-date"><strong>Date</strong><span>${date}</span></div>
  `;
}

// Call updateInfoCarousel on load and when data updates (mobile only)
function isMobile() {
  return window.innerWidth <= 700;
}
if (isMobile()) updateInfoCarousel();
window.addEventListener('resize', () => {
  if (isMobile()) updateInfoCarousel();
});

// Toggle info panel on small screens
const toggleBtn = document.getElementById('toggle-info');
const infoPanel = document.getElementById('info-panel');
if (toggleBtn && infoPanel) {
  toggleBtn.addEventListener('click', () => {
    infoPanel.classList.toggle('hide-info');
  });
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2); // in km
}
