/* Field Survey Tracker locationService.js */
// ===== LOCATION =====
function useCurrentLocation() {
  document.getElementById('loc-status').textContent = 'ກຳລັງດຶງ GPS...';
  navigator.geolocation.getCurrentPosition(
    pos => setModalLocation(pos.coords.latitude, pos.coords.longitude, 'GPS ປັດຈຸບັນ'),
    () => { document.getElementById('loc-status').textContent = 'ດຶງ GPS ບໍ່ໄດ້'; },
    { enableHighAccuracy: true }
  );
}
function pickOnMap() {
  closeModal(); pickingLocation = true;
  leafletMap.getContainer().style.cursor = 'crosshair';
  switchView('map'); alert('ກົດໃສ່ແຜນທີ່ ເພື່ອເລືອກ location');
}
function setModalLocation(lat, lng, name) {
  editLat = lat; editLng = lng;
  document.getElementById('loc-status').textContent = `📍 ${name} (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
}
