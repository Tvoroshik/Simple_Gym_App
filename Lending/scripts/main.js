import * as THREE from 'three';

const container = document.getElementById('bg-layer');

// Камера и сцена
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);

const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// ===== Пиксельный качок со штангой =====
const W = 64, H = 80;
const canvas = document.createElement('canvas');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

const texture = new THREE.CanvasTexture(canvas);
texture.magFilter = THREE.NearestFilter;
texture.minFilter = THREE.NearestFilter;
texture.generateMipmaps = false;
texture.colorSpace = THREE.SRGBColorSpace;

// Зелёная приглушённая палитра
const MAIN  = '#2e9e5b';                  // тело
const DARK  = '#1c6b3f';                  // тени/пресс
const GLOW  = 'rgba(46, 158, 91, 0.15)';  // слабое свечение
const BAR   = '#6b7280';                  // гриф
const PLATE = '#3a3f47';                  // блины

function px(x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x | 0, y | 0, w, h);
}

// «Толстая линия» между двумя точками
function seg(x0, y0, x1, y1, thick, c) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
  for (let s = 0; s <= steps; s++) {
    const t = steps === 0 ? 0 : s / steps;
    px(x0 + (x1 - x0) * t - thick / 2, y0 + (y1 - y0) * t - thick / 2, thick, thick, c);
  }
}

// Качок; hy — высота грифа (чем меньше, тем выше над головой)
function drawDude(hy, main, dark, ox = 0, oy = 0) {
  const cx = 32;

  // Ноги и ступни
  px(23 + ox, 54 + oy, 6, 22, main);
  px(35 + ox, 54 + oy, 6, 22, main);
  px(20 + ox, 74 + oy, 9, 4, main);
  px(35 + ox, 74 + oy, 9, 4, main);

  // Бёдра
  px(21 + ox, 48 + oy, 22, 8, main);

  // Торс
  for (let y = 24; y <= 48; y++) {
    const t = (y - 24) / 24;
    const w = Math.round(30 - t * 12);
    px(cx - w / 2 + ox, y + oy, w, 1, main);
  }

  // Пресс
  for (let y = 34; y <= 46; y += 4) px(cx - 4 + ox, y + oy, 8, 1, dark);
  px(cx - 1 + ox, 32 + oy, 2, 14, dark);

  // Дельты
  px(15 + ox, 24 + oy, 6, 8, main);
  px(43 + ox, 24 + oy, 6, 8, main);

  // Шея и голова
  px(28 + ox, 20 + oy, 8, 4, main);
  px(26 + ox, 8 + oy, 12, 12, main);
  px(27 + ox, 9 + oy, 10, 2, dark);

  // Позиция грифа: руки от плеч к грифу через локти
  const s1x = 18, s1y = 27;   // левое плечо
  const s2x = 46, s2y = 27;   // правое плечо
  const h1x = 22, h2x = 42;   // хват на грифе

  // Локти: разведены в стороны и ниже линии «плечо—кисть»
  const e1x = 13, e2x = 51;
  const e1y = (s1y + hy) / 2 + 3;
  const e2y = (s2y + hy) / 2 + 3;

  seg(s1x + ox, s1y + oy, e1x + ox, e1y + oy, 6, main); // левое плечо→локоть
  seg(e1x + ox, e1y + oy, h1x + ox, hy + oy, 5, main);  // локоть→кисть
  seg(s2x + ox, s2y + oy, e2x + ox, e2y + oy, 6, main); // правое плечо→локоть
  seg(e2x + ox, e2y + oy, h2x + ox, hy + oy, 5, main);
}

// Штанга: гриф и блины
function drawBarbell(hy, ox = 0, oy = 0) {
  px(12 + ox, hy - 1 + oy, 40, 3, BAR);   // гриф
  px(9 + ox,  hy - 8 + oy, 5, 18, PLATE); // левый блин
  px(50 + ox, hy - 8 + oy, 5, 18, PLATE); // правый блин
  px(9 + ox,  hy - 3 + oy, 5, 7, BAR);    // «замки» на блинах
  px(50 + ox, hy - 3 + oy, 5, 7, BAR);
}

function renderFrame(hy, bob) {
  ctx.clearRect(0, 0, W, H);

  // Слабое свечение: пара полупрозрачных копий
  ctx.globalAlpha = 0.15;
  drawDude(hy, GLOW, GLOW, -2, bob);
  drawDude(hy, GLOW, GLOW, 2, bob);
  ctx.globalAlpha = 1;

  // Основной силуэт и штанга
  drawDude(hy, MAIN, DARK, 0, bob);
  drawBarbell(hy, 0, bob);
  texture.needsUpdate = true;
}

// ===== Плоскость со спрайтом =====
const geometry = new THREE.PlaneGeometry(1, 1);
const material = new THREE.MeshBasicMaterial({
  map: texture,
  transparent: true,
  opacity: 0.4   // менее заметный: полупрозрачный фон
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Размер: 80% высоты экрана
const FILL = 0.8;

function visibleHeight() {
  return 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
}

function updateSize(breathe = 1) {
  const h = visibleHeight() * FILL * breathe;
  const w = h * (W / H);
  mesh.scale.set(w, h, 1);
}

// ===== Реакция на мышь =====
const mouse = { x: 0, y: 0 };

document.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth - 0.5) * 2;
  mouse.y = (event.clientY / window.innerHeight - 0.5) * 2;
});

// ===== Ресайз =====
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== Анимация =====
function animate() {
  const t = Date.now() * 0.001;

  // Жим вверх: гриф от уровня плеч (26) до вытянутых рук над головой (4)
  const press = 0.5 + 0.5 * Math.sin(t * 0.8);
  const hy = 26 - press * 22;

  const breathe = 1 + Math.sin(t * 0.5) * 0.03;
  const bob = Math.round(Math.sin(t * 0.8) * 1.5);

  renderFrame(Math.round(hy), bob);
  updateSize(breathe);

  mesh.position.set(mouse.x * 0.15, -mouse.y * 0.1, 0);

  renderer.render(scene, camera);
}

updateSize();
renderer.setAnimationLoop(animate);
