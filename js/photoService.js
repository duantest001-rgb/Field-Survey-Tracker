/* Field Survey Tracker photoService.js */
// ===== PHOTO =====
function handlePhoto(input) {
  if (!input.files[0]) return;
  editPhotoFile = input.files[0];
  const reader = new FileReader();
  reader.onload = e => { document.getElementById('photo-preview').src=e.target.result; document.getElementById('photo-preview').classList.remove('hidden'); };
  reader.readAsDataURL(editPhotoFile);
}

document.getElementById('modal').addEventListener('click', function(e) { if (e.target===this) closeModal(); });
document.getElementById('modal').addEventListener('touchmove', function(e) { if (e.target===this) e.preventDefault(); }, { passive: false });
