
(function () {
  const canvas = document.getElementById('sakura-layer');
  const ctx = canvas.getContext('2d');

  let W, H, petals = [];
  const COUNT = 34; // количество лепестков — меняйте по вкусу

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // Случайное число в диапазоне
  const rnd = (min, max) => Math.random() * (max - min) + min;

  function createPetal(init) {
    return {
      x: rnd(-50, W + 50),
      y: init ? rnd(-H, H) : rnd(-80, -20),
      size: rnd(7, 16),              // размер лепестка
      speedY: rnd(0.4, 1.1),         // скорость падения
      speedX: rnd(-0.4, 0.4),        // лёгкий снос в сторону
      sway: rnd(0.4, 1.4),           // амплитуда покачивания
      swayPhase: rnd(0, Math.PI * 2),
      rotation: rnd(0, Math.PI * 2),
      spin: rnd(-0.02, 0.02),        // скорость вращения
      opacity: rnd(0.25, 0.6),
      hue: rnd(330, 350)             // оттенок розового
    };
  }

  for (let i = 0; i < COUNT; i++) petals.push(createPetal(true));

  // Рисуем один лепесток сакуры (сердцевидная форма с выемкой)
  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.opacity;

    const s = p.size;
    const grad = ctx.createLinearGradient(-s, -s, s, s);
    grad.addColorStop(0, `hsla(${p.hue}, 70%, 85%, 0.9)`);
    grad.addColorStop(1, `hsla(${p.hue}, 65%, 70%, 0.9)`);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, -s);
    // правая половина лепестка с выемкой на кончике
    ctx.bezierCurveTo(s * 0.9, -s * 0.6, s * 0.8, s * 0.6, 0, s);
    // выемка
    ctx.lineTo(-s * 0.15, s * 0.55);
    // левая половина
    ctx.bezierCurveTo(-s * 0.8, s * 0.6, -s * 0.9, -s * 0.6, 0, -s);
    ctx.fill();
    ctx.restore();
  }

  function update() {
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < petals.length; i++) {
      const p = petals[i];
      p.swayPhase += 0.01;
      p.x += p.speedX + Math.sin(p.swayPhase) * p.sway;
      p.y += p.speedY;
      p.rotation += p.spin;

      // если лепесток улетел за экран — отправляем наверх
      if (p.y > H + 60 || p.x < -100 || p.x > W + 100) {
        petals[i] = createPetal(false);
      }

      drawPetal(p);
    }

    requestAnimationFrame(update);
  }

  update();
})();

