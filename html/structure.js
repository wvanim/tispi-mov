// structure.js — animation de la structure Tispi

const DURATION  = 10000;  // durée du cycle en ms
const PIECE_Z   = 600;    // amplitude du déplacement en px
const ZONE_BEFORE =   2;  // opacité=1 dès 2px avant Z=0
const ZONE_AFTER  =  90;  // opacité=1 jusqu'à 90px après Z=0
const ZONE_FADE   =  10;  // fondu aux bords (px)

const zPositions = [-30, -130, -250, -370, -490];

let piece = null;
let faces = [];
let groupFaces   = [];   // faces intérieures de #group (front, top, right)
let gearEl       = null;
let startTime    = null;
let isPlaying    = true;
let pausedAt     = 0;    // elapsed ms au moment du pause

function createPiece(x, y) {
  const el = document.createElement('div');
  el.className = 'piece';
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  el.innerHTML = `
    <div class="piece-face pf-front"></div>
    <div class="piece-face pf-top"></div>
    <div class="piece-face pf-right"></div>
    <div style="
      position:absolute;
      left:10px; top:10px;
      transform:translateX(-50%);
      color:rgba(100,160,255,1);
      font:bold 22px Arial;
      white-space:nowrap;
      letter-spacing:4px;">PIECE</div>
  `;
  return el;
}

const faceData = [
  // Face 0 — image savant.gif en background
  { bg: 'url("savant.gif")', html: '' },

  // Face 1 — texte
  { bg: null, html: `<div style="
    width:100%;height:100%;display:flex;
    justify-content:center;align-items:center;
    color:#fff;font:bold 16px Arial;
    text-shadow:0 0 8px rgba(255,255,255,0.8);">
    Hello world
  </div>` },

  // Face 2 — label groupe
  { bg: null, html: `<div style="
    width:100%;height:100%;display:flex;
    justify-content:center;align-items:center;
    color:rgba(255,200,80,1);font:bold 22px Arial;
    letter-spacing:4px;">GROUP</div>` },

  // Face 3 — image notes128.png en background
  { bg: 'url("notes128.png")', html: '' },

  // Face 3 — SVG avec fond dégradé
  { bg: null, html: `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="#ff6ec7"/>
        <stop offset="100%" stop-color="#6e8cff"/>
      </linearGradient>
    </defs>
    <polygon
      points="64,9 76.9,46.2 116.3,47 84.9,70.8 96.3,108.5 64,86 31.7,108.5 43.1,70.8 11.7,47 51.1,46.2"
      fill="url(#grad)" stroke="white" stroke-width="1.5"/>
  </svg>` },
];

function createFace(z, index) {
  // wrapper — positionné sur l'axe Z, reçoit l'opacité
  const wrapper = document.createElement('div');
  wrapper.id = `face-${index}`;
  wrapper.style.cssText = `position:absolute; transform:translateZ(${z}px);`;

  // carré jaune — garde sa position visuelle dans le plan X/Y
  const el = document.createElement('div');
  el.className = 'face';
  if (index === 2) el.id = 'base-groupe';
  const d = faceData[index];
  if (d.bg) {
    el.style.backgroundImage = d.bg;
    el.style.backgroundSize  = 'cover';
  }
  el.style.overflow = 'hidden';
  el.innerHTML = d.html + `<span>Face ${index}</span>`;

  wrapper.appendChild(el);
  wrapper._inner = el;  // référence pour animer l'inner sans toucher le wrapper
  return wrapper;
}

function createGroup() {
  const face2 = document.getElementById('face-2');
  face2.style.transformStyle = 'preserve-3d';

  const group = document.createElement('div');
  group.id = 'group';
  group.style.cssText = `
    position: absolute;
    width: 400px; height: 10px;
    left: -190px; top: -138px;
    transform-style: preserve-3d;
  `;

  // Face avant — plan XY
  const front = document.createElement('div');
  front.style.cssText = `
    position: absolute;
    width: 400px; height: 10px;
    background: rgba(255, 200, 80, 0.9);
    border: 1px solid rgba(255, 220, 100, 1);
  `;

  // Face supérieure — plan XZ, apparaît comme parallélogramme
  const top = document.createElement('div');
  top.style.cssText = `
    position: absolute;
    width: 400px; height: 30px;
    transform-origin: 0 0;
    transform: rotateX(-90deg);
    background: rgba(255, 200, 80, 0.55);
    border: 1px solid rgba(255, 220, 100, 0.8);
  `;

  // Face droite — plan YZ
  const right = document.createElement('div');
  right.style.cssText = `
    position: absolute;
    width: 30px; height: 10px;
    left: 400px; top: 0;
    transform-origin: 0 0;
    transform: rotateY(90deg);
    background: rgba(255, 180, 40, 0.75);
    border: 1px solid rgba(255, 220, 100, 0.8);
  `;

  const labels = document.createElement('div');
  labels.style.cssText = `
    position:absolute;
    width:400px; top:-28px; left:0;
    display:flex; justify-content:space-around; align-items:center;
  `;
  for (let i = 0; i < 4; i++) {
    const lbl = document.createElement('span');
    lbl.textContent = 'PIECE';
    lbl.style.cssText = `color:rgba(100,160,255,1);font:bold 14px Arial;letter-spacing:2px;`;
    labels.appendChild(lbl);
  }

  group.appendChild(front);
  group.appendChild(top);
  group.appendChild(right);
  group.appendChild(labels);
  face2.appendChild(group);
  groupFaces = [front, top, right, labels];
}

function createGear() {
  const N = 9, R_OUT = 15, R_IN = 10, R_HOLE = 4, DEPTH = 6;

  function gearVerts() {
    const verts = [], step = (2 * Math.PI) / N, tw = step * 0.187;
    for (let i = 0; i < N; i++) {
      const a = i * step - Math.PI / 2;
      verts.push([R_OUT * Math.cos(a - tw), R_OUT * Math.sin(a - tw)]);
      verts.push([R_OUT * Math.cos(a + tw), R_OUT * Math.sin(a + tw)]);
      verts.push([R_IN  * Math.cos(a + step / 2), R_IN * Math.sin(a + step / 2)]);
    }
    return verts;
  }

  const verts = gearVerts();
  const ptsStr = verts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  function makeSVG(id, c1, c2) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-15 -15 30 30" style="width:30px;height:30px;display:block;">
      <defs><radialGradient id="${id}" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
      </radialGradient></defs>
      <polygon points="${ptsStr}" fill="url(#${id})" stroke="rgba(150,210,255,0.6)" stroke-width="0.4"/>
      <circle r="${R_HOLE}" fill="#0a0a1e" stroke="rgba(150,200,255,0.4)" stroke-width="0.4"/>
    </svg>`;
  }

  const container = document.createElement('div');
  container.id = 'gear';
  container.style.cssText = `
    position:absolute; left:-10px; top:8px;
    width:30px; height:30px;
    transform-style:preserve-3d;
  `;

  const back = document.createElement('div');
  back.style.cssText = `position:absolute; width:30px; height:30px; transform:translateZ(-${DEPTH}px);`;
  back.innerHTML = makeSVG('gearBack', '#5a8', '#1a4070');

  const front = document.createElement('div');
  front.style.cssText = `position:absolute; width:30px; height:30px;`;
  front.innerHTML = makeSVG('gearFront', '#9bd', '#3670b0');

  container.appendChild(back);
  container.appendChild(front);

  // Faces latérales — une par arête du polygone
  const nV = verts.length;
  for (let i = 0; i < nV; i++) {
    const [x1, y1] = verts[i];
    const [x2, y2] = verts[(i + 1) % nV];
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const isTooth = i % 3 < 2;
    const side = document.createElement('div');
    side.style.cssText = `
      position:absolute;
      width:${len.toFixed(1)}px; height:${DEPTH}px;
      left:${(x1 + 15).toFixed(1)}px; top:${(y1 + 15).toFixed(1)}px;
      transform-origin:0 0;
      transform:rotateZ(${angle.toFixed(1)}deg) rotateX(-90deg);
      background:${isTooth ? 'rgba(55,110,195,0.9)' : 'rgba(25,60,130,0.8)'};
    `;
    container.appendChild(side);
  }

  return container;
}

function createAxes() {
  const axisColor = 'rgba(180, 80, 255, 0.85)';

  // Axe X — ligne horizontale à Z=0
  const axeX = document.createElement('div');
  axeX.style.cssText = `
    position: absolute;
    width: 800px; height: 1px;
    left: -400px; top: 0;
    background: ${axisColor};
  `;

  // Axe Y — ligne verticale à Z=0
  const axeY = document.createElement('div');
  axeY.style.cssText = `
    position: absolute;
    width: 1px; height: 800px;
    left: 0; top: -400px;
    background: ${axisColor};
  `;

  return [axeX, axeY];
}


function build() {
  const world = document.querySelector('.world');

  createAxes().forEach(ax => world.appendChild(ax));

  piece = createPiece(0, 0);

  zPositions.forEach((z, i) => {
    const face = createFace(z, i);
    faces.push(face._inner);  // on anime l'inner (.face), pas le wrapper
    piece.appendChild(face);
  });

  world.appendChild(piece);
  gearEl = createGear();
  world.appendChild(gearEl);
  createGroup();
  requestAnimationFrame(animate);
}

function animate(timestamp) {
  if (!startTime) startTime = timestamp - pausedAt;

  const elapsed = (timestamp - startTime) % DURATION;
  const pieceZ  = (elapsed / DURATION) * PIECE_Z;   // 0 → 400

  // Déplacement de la barre
  piece.style.transform = `translateZ(${pieceZ}px)`;

  // Rotation de l'engrenage — 1 tour en 3 s
  if (gearEl) {
    const gearAngle = (timestamp / 7000) * 360;
    gearEl.style.transform = `rotateY(270deg) rotateZ(${gearAngle}deg)`;
  }

  // Opacité de chaque carré selon sa position Z absolue
  faces.forEach((face, i) => {
    const z = pieceZ + zPositions[i];  // signé
    let t;
    if      (z < -(ZONE_BEFORE + ZONE_FADE)) t = 0;
    else if (z < -ZONE_BEFORE)               t = (z + ZONE_BEFORE + ZONE_FADE) / ZONE_FADE;
    else if (z <= ZONE_AFTER)                t = 1;
    else if (z <= ZONE_AFTER + ZONE_FADE)    t = 1 - (z - ZONE_AFTER) / ZONE_FADE;
    else                                     t = 0;
    face.style.opacity = 0.35 + 0.65 * t;
    if (i === 2) groupFaces.forEach(f => f.style.opacity = 0.35 + 0.65 * t);
  });

  if (isPlaying) requestAnimationFrame(animate);
}

function togglePlay() {
  const btn = document.getElementById('btn-play');
  if (isPlaying) {
    pausedAt  = (performance.now() - startTime) % DURATION;
    isPlaying = false;
    btn.textContent = 'Play';
  } else {
    isPlaying = true;
    startTime = null;
    btn.textContent = 'Stop';
    requestAnimationFrame(animate);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  build();
  document.getElementById('btn-play').addEventListener('click', togglePlay);
});
