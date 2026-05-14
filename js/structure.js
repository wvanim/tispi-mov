// structure.js — animation de la structure Tispi

const PIECE_Z = 400;  // profondeur de la barre en px

function createPiece(x, y) {
  const piece = document.createElement('div');
  piece.className = 'piece';
  piece.style.left = x + 'px';
  piece.style.top  = y + 'px';

  piece.innerHTML = `
    <div class="piece-face pf-front"></div>
    <div class="piece-face pf-top"></div>
    <div class="piece-face pf-right"></div>
  `;

  return piece;
}

function createFace(z, label) {
  const face = document.createElement('div');
  face.className = 'face';
  face.style.transform = `translateZ(${z}px)`;
  face.innerHTML = `<span>${label}</span>`;
  return face;
}

function build() {
  const world = document.querySelector('.world');

  const piece = createPiece(-10, -2);

  const zPositions = [-30, -130, -250, -370];
  zPositions.forEach((z, i) => {
    piece.appendChild(createFace(z, `Face ${i}`));
  });

  world.appendChild(piece);
}

document.addEventListener('DOMContentLoaded', build);
