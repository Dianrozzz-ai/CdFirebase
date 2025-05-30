import { auth, db } from '../firebaseConfig.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default async function mostrarPerfil() {
  const app = document.getElementById('app');
  app.innerHTML = `<h2>Perfil del Usuario</h2><p id="cargando">Cargando...</p>`;

  const uid = auth.currentUser?.uid;
  if (!uid) {
    app.innerHTML = '<p>Error: Usuario no autenticado</p>';
    return;
  }

  const docRef = doc(db, 'usuarios', uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    app.innerHTML = '<p>Usuario no encontrado</p>';
    return;
  }

  const { nombre = '', fecha = '', telefono = '' } = docSnap.data();

  // Renderizar formulario
  app.innerHTML = `
    <h2>Perfil del Usuario</h2>
    <div style="display: flex; flex-direction: column; gap: 10px; max-width: 400px;">
      <input id="nombre" placeholder="Nombre" value="${nombre}" />
      <input id="fecha" placeholder="Fecha de nacimiento (YYYY-MM-DD)" value="${fecha}" />
      <input id="telefono" placeholder="Teléfono" value="${telefono}" />
      <button id="guardar">Guardar cambios</button>
    </div>
  `;

  document.getElementById('guardar').addEventListener('click', async () => {
    const nuevoNombre = document.getElementById('nombre').value;
    const nuevaFecha = document.getElementById('fecha').value;
    const nuevoTelefono = document.getElementById('telefono').value;

    try {
      await updateDoc(docRef, {
        nombre: nuevoNombre,
        fecha: nuevaFecha,
        telefono: nuevoTelefono,
      });
      alert('Datos actualizados correctamente');
    } catch (error) {
      console.error(error);
      alert('Error al actualizar los datos');
    }
  });
}