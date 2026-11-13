(function () {
  // Маска телефона
  const phoneInput = document.getElementById('client-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function (e) {
      let x = e.target.value.replace(/\D/g, '').match(/(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);
      if (!x) { e.target.value = x ? '+7' : ''; return; }
      e.target.value = !x ? `+7 (${x}` : `+7 (${x}) ${x}-${x}-\${x}`;
    });
  }

  // Маска возраста
  const ageInput = document.getElementById('client-age');
  if (ageInput) {
    ageInput.addEventListener('input', function (e) {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
  }

  // Отправка формы
  const form = document.querySelector('.anketa-form');
  const btn = form.querySelector('.form-submit');
  if (!form || !btn) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    btn.disabled = true;
    btn.querySelector('.submit-label').textContent = 'Отправляем…';

    setTimeout(function () {
      form.reset();
      btn.disabled = false;
      btn.querySelector('.submit-label').textContent = 'Отправить заявку';
      alert('Спасибо! Заявка отправлена. Я свяжусь с вами в течение 24 часов.');
    }, 1200);
  });
})();

