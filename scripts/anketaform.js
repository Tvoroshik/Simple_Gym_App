(function () {
  const form = document.querySelector('form');
  const btn = document.getElementById('submit-btn');
  const success = document.getElementById('form-success');
  if (!form || !btn || !success) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity(); // браузер сам подскажет, какое поле не заполнено
      return;
    }

    // Блокируем кнопку на время «отправки»
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.querySelector('.submit-label').textContent = 'Отправляем…';

    // Имитация отправки на сервер
    setTimeout(function () {
      form.hidden = true;          // скрываем форму
      success.hidden = false;      // показываем сообщение
      success.classList.add('visible');
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 900);
  });
})();
