import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig.js';

import  mostrarHome from './componentes/home.js';
import  mostrarOriginal from './componentes/original.js';
import  mostrarPerfil from './componentes/perfil.js';
import  mostrarLogout from './componentes/logout.js';
import  mostrarLogin from './componentes/login.js';
import  mostrarRegistro from './componentes/registro.js';

function renderMenu(usuario) {
  const menu = document.getElementById("menu");
  menu.innerHTML = "";

  let botones = [];

  if (usuario) {
    botones = [
      { texto: "Home", fn: mostrarHome },
      { texto: "Original", fn: mostrarOriginal },
      { texto: "Perfil", fn: mostrarPerfil },
      { texto: "Logout", fn: mostrarLogout },
    ];
  } else {
    botones = [
      { texto: "Login", fn: mostrarLogin },
      { texto: "Registro", fn: mostrarRegistro },
    ];
  }

  botones.forEach(({ texto, fn }) => {
    const btn = document.createElement("button");
    btn.textContent = texto;
    btn.onclick = fn;
    menu.appendChild(btn);
  });
}


onAuthStateChanged(auth, (user) => {
  renderMenu(user);
  if (user) {
    mostrarHome();
  } else {
    mostrarLogin();
  }
});