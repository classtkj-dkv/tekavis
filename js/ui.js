// Pengganti alert()/confirm() bawaan browser dengan modal bergaya web
// (pakai <dialog class="modal"> yang sama kayak modal lain di app ini),
// bukan popup default Chrome/Android yang keluar dari tema aplikasi.
// Satu dialog dipakai ulang (singleton) buat semua pemanggilan.

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'modal ui-confirm-modal';
  dialogEl.innerHTML = `
    <div class="modal-content">
      <p id="ui-confirm-message" class="ui-confirm-message"></p>
      <div class="ui-confirm-actions">
        <button type="button" id="ui-confirm-cancel" class="btn btn-secondary">Batal</button>
        <button type="button" id="ui-confirm-ok" class="btn btn-primary">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(dialogEl);
  return dialogEl;
}

/** Pengganti window.alert() — cuma tombol OK, resolve pas ditutup. */
export function showAlert(message) {
  const dialog = ensureDialog();
  return new Promise((resolve) => {
    dialog.querySelector('#ui-confirm-message').textContent = message;
    const cancelBtn = dialog.querySelector('#ui-confirm-cancel');
    const okBtn = dialog.querySelector('#ui-confirm-ok');
    cancelBtn.style.display = 'none';
    okBtn.className = 'btn btn-primary';
    okBtn.textContent = 'OK';

    function onOk() { cleanup(); resolve(); }
    function onCancel() { cleanup(); resolve(); }
    function cleanup() {
      okBtn.removeEventListener('click', onOk);
      dialog.removeEventListener('cancel', onCancel);
      dialog.close();
    }
    okBtn.addEventListener('click', onOk);
    dialog.addEventListener('cancel', onCancel, { once: true });
    dialog.showModal();
  });
}

/** Pengganti window.confirm() — resolve(true) kalau OK, resolve(false) kalau Batal/ESC. */
export function showConfirm(message, { okText = 'Ya, lanjutkan', cancelText = 'Batal', danger = false } = {}) {
  const dialog = ensureDialog();
  return new Promise((resolve) => {
    dialog.querySelector('#ui-confirm-message').textContent = message;
    const cancelBtn = dialog.querySelector('#ui-confirm-cancel');
    const okBtn = dialog.querySelector('#ui-confirm-ok');
    cancelBtn.style.display = '';
    cancelBtn.textContent = cancelText;
    okBtn.textContent = okText;
    okBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';

    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }
    function cleanup(result) {
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      dialog.removeEventListener('cancel', onCancel);
      dialog.close();
      resolve(result);
    }
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    dialog.addEventListener('cancel', onCancel, { once: true });
    dialog.showModal();
  });
}
