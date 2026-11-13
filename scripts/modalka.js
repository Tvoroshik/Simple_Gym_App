
(function () {
  const form    = document.getElementById('lead-form');
  const success = document.getElementById('lead-success');
  if (!form || !success) return;

  let redirectTimer = null;
  let cancelled = false;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const btn = form.querySelector('.btn-primary');
    btn.disabled = true;
    btn.textContent = 'Отправляем…';

    // Имитация отправки. При появлении бэкенда замените на:
    // fetch('...', { method: 'POST', body: new FormData(form) })
    setTimeout(function () {
      // Форма остаётся видимой: сбрасываем поля и возвращаем кнопку
      form.reset();
      btn.disabled = false;
      btn.textContent = 'Отправить заявку';

      // Показываем блок успеха, не убирая форму
      success.hidden = false;
      success.classList.add('visible');
      success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      startRedirect();
    }, 900);
  });

  function startRedirect() {
    // Если отсчёт уже шёл — перезапускаем с 4 секунд
    clearInterval(redirectTimer);
    cancelled = false;

    let seconds = 4;
    const timerEl = document.getElementById('redirect-timer');
    const stayBtn = document.getElementById('success-stay');
    const note    = document.querySelector('.success-redirect');

    if (timerEl) timerEl.textContent = seconds;
    stayBtn.hidden = false;

    stayBtn.addEventListener('click', function () {
      cancelled = true;
      clearInterval(redirectTimer);
      note.textContent = 'Хорошо, анкета никуда не денется — зелёная кнопка выше, когда будете готовы.';
      stayBtn.hidden = true;
    });

    redirectTimer = setInterval(function () {
      seconds--;
      if (timerEl) timerEl.textContent = seconds;

      if (seconds <= 0) {
        clearInterval(redirectTimer);
        if (!cancelled) window.location.href = 'anketa.html';
      }
    }, 1000);
  }
})();