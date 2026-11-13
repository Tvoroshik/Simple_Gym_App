(function () {
  // Данные отзывов: подставьте реальные имена файлов «до»
  const reviews = [
    {
      before: 'img/From.png',
      after:  'img/To.png',
      quote:  '«Минус 9 кг за 3 месяца без жёстких диет. Впервые тренировки не превращаются в каторгу».',
      author: 'Клиент, 31 год'
    },
    {
      before: 'img/From2.png',
      after:  'img/To2.png',
      quote:  '«Через полгода впервые увидел пресс. Программа и план питания делают всё».',
      author: 'Клиент, 27 лет'
    },
    {
      before: 'img/From3.png',
      after:  'img/To3.png',
      quote:  '«Готовили к первым соревнованиям по бодибилдингу. Разложили всё по полочкам».',
      author: 'Клиент, 24 года'
    }
  ];

  const modal   = document.getElementById('compare-modal');
  const slider  = document.getElementById('compare-slider');
  const imgB    = document.getElementById('compare-before');
  const imgA    = document.getElementById('compare-after');
  const quote   = document.getElementById('compare-quote');
  const author  = document.getElementById('compare-author');

  // --- Открытие модалки ---
  document.querySelectorAll('.review-photo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const data = reviews[+btn.dataset.index];
      if (!data) return;

      imgB.src = data.before;
      imgA.src = data.after;
      quote.textContent = data.quote;
      author.textContent = data.author;

      setClip(50); // стартуем с середины
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
    });
  });

  // --- Закрытие: крестик, фон, Esc ---
  modal.querySelectorAll('[data-close]').forEach(el =>
    el.addEventListener('click', close)
  );
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });

  function close() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  // --- Рабочий ползунок: мышь и палец ---
  function setClip(percent) {
    const p = Math.max(2, Math.min(98, percent));
    imgA.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
    slider.querySelector('.compare-line').style.left = p + '%';
    slider.querySelector('.compare-knob').style.left = p + '%';
  }

  function move(e) {
    const rect = slider.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    setClip((x / rect.width) * 100);
  }

  let dragging = false;

  slider.addEventListener('pointerdown', e => {
    dragging = true;
    slider.setPointerCapture(e.pointerId);
    move(e);
  });
  slider.addEventListener('pointermove', e => dragging && move(e));
  slider.addEventListener('pointerup',    () => dragging = false);
  slider.addEventListener('pointercancel', () => dragging = false);
})();
