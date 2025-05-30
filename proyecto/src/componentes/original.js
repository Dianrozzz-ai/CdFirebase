// Importa las instancias de auth y db desde tu archivo de configuración de Firebase.
// ESTO ES CLAVE: Asumimos que 'firebaseConfig.js' inicializa Firebase y exporta auth y db.
// Ajusta la ruta '../firebaseConfig.js' si tu estructura de carpetas es diferente.
import { auth, db } from '../firebaseConfig.js';
// Importa las funciones de Firestore y Auth necesarias.
import { collection, addDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'; // Importa todas las funciones de firestore
import { onAuthStateChanged } from 'firebase/auth'; // Importa onAuthStateChanged

// La variable appId es proporcionada por el entorno Canvas.
// Es necesaria para construir las rutas de Firestore para datos privados del usuario.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// userId se establecerá con onAuthStateChanged.
let userId = null;

// Variables globales para el juego de ahorcado
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); // Definición del alfabeto
const MAX_ATTEMPTS = 6; // Número máximo de intentos

let dcCharactersList = []; // Almacenará la lista de personajes de DC
let characterName = '';      // El nombre del personaje a adivinar
let characterId = '';        // El ID del personaje
let characterImage = '';     // La URL de la imagen del personaje
let guessedLetters = [];   // Letras que el usuario ya ha adivinadas
let wrongGuesses = 0;      // Número de intentos fallidos
let gameOver = false;      // Estado de fin de juego
let gameWon = false;       // Estado de juego ganado
let userWin = 0;           // Contador de partidas ganadas por el usuario
let userLose = 0;          // Contador de partidas perdidas por el usuario
let uid = null;            // ID del usuario autenticado (sinónimo de userId aquí)

// Referencias a elementos del DOM para el juego
let app; // Referencia al contenedor principal de la aplicación
let wordDisplay;
let guessedLettersDisplay;
let remainingGuessesDisplay;
let guessInput;
let guessButton;
let newGameButton;
let messageBox;
let userIdDisplay; // Para mostrar el ID del usuario
let characterImageDisplay; // Reference for the character image element

// Función para mostrar mensajes personalizados en lugar de alert()
function showMessage(message, type = 'info') {
    if (!messageBox) {
        console.error('Elemento messageBox no encontrado.');
        return;
    }
    messageBox.textContent = message;
    messageBox.className = `p-3 rounded-lg text-white text-center mb-4 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`;
    messageBox.style.display = 'block';

    // Oculta el mensaje después de unos segundos
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 3000);
}

// Función para guardar el resultado del juego en Firestore
async function saveGameResult(acierto) {
    if (!uid) { // Usamos 'uid' que es la variable local para el ID de usuario
        showMessage('No se pudo guardar el resultado. Inicia sesión para guardar tus partidas.', 'error');
        return;
    }
    if (!db) {
        showMessage('Error: Firestore no está disponible. Asegúrate de que `db` esté inicializado correctamente en firebaseConfig.js.', 'error');
        return;
    }

    // --- LÍNEA DE DEPURACIÓN ---
    console.log('Debug: db instance in saveGameResult:', db);
    // --- FIN LÍNEA DE DEPURACIÓN ---

    const fecha = new Date().toISOString();
    const resultado = {
        uid,
        character: characterName, // Cambiado de 'pokemon' a 'character'
        aciertos: acierto ? 1 : 0,
        errores: acierto ? 0 : 1,
        fecha,
    };

    try {
        // Define la ruta de la colección para los resultados del juego del usuario.
        const resultsCollectionRef = collection(db, `artifacts/${appId}/users/${uid}/hangman_results`); // Usar uid aquí

        // Añade un nuevo documento con el resultado del juego.
        await addDoc(resultsCollectionRef, resultado); // Usar resultado aquí
        showMessage('Resultado del juego guardado con éxito.', 'info');

        // Actualizar estadísticas del usuario en la colección 'user_stats' dentro de la ruta privada del usuario
        const userStatsDocRef = doc(db, 'artifacts', appId, 'users', uid, 'user_stats', 'stats_doc');
        await setDoc(userStatsDocRef, {
            ganados: userWin,
            perdidos: userLose,
        }, { merge: true }); // Usar merge: true para no sobrescribir otros campos si existen

    } catch (error) {
        console.error("Error al guardar el resultado del juego:", error);
        showMessage(`Error al guardar el resultado: ${error.message}`, 'error');
    }
}

// Función para crear elementos HTML de forma programática
function createElement(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (key === 'className') el.className = value;
        else if (key.startsWith('on') && typeof value === 'function') {
            el.addEventListener(key.substring(2).toLowerCase(), value);
        } else {
            el.setAttribute(key, value);
        }
    }
    for (const child of children) {
        if (typeof child === 'string') el.appendChild(document.createTextNode(child));
        else if (child instanceof Node) el.appendChild(child);
    }
    return el;
}

// Función para renderizar la UI del juego
function render() {
    app.innerHTML = ''; // Limpia el contenido anterior

    const title = createElement('h2', { className: 'text-3xl font-bold text-center mb-6 text-indigo-700' }, 'Adivina el Personaje DC'); // Título actualizado
    const stats = createElement('p', { className: 'text-sm text-gray-500 text-center mb-4' }, `Ganados: ${userWin} | Perdidos: ${userLose}`);
    app.appendChild(title);
    app.appendChild(stats);

    if (!characterName) { // Usar characterName
        app.appendChild(createElement('p', {}, 'Cargando Personaje DC...'));
        return;
    }

    app.appendChild(createElement('p', {}, `ID de Personaje: ${characterId}`)); // Mostrar ID del personaje

    // Mostrar la imagen del personaje
    const img = createElement('img', {
        src: characterImage, // Usar characterImage
        alt: characterName,
        className: 'w-24 h-24 object-cover rounded-full mx-auto mb-4 border-2 border-blue-300',
        onerror: (e) => { e.target.src = 'https://placehold.co/100x100/cccccc/333333?text=No+Image'; } // Fallback
    });
    app.appendChild(img);

    // Mostrar palabra con guiones o letras
    const wordDiv = createElement('div', { className: 'text-xl font-semibold mb-4 tracking-widest' });
    for (const letter of characterName) { // Usar characterName
        const displayLetter = (guessedLetters.includes(letter) || gameOver || gameWon) ? letter : '_';
        const span = createElement('span', { style: 'margin-right: 6px;' }, displayLetter);
        wordDiv.appendChild(span);
    }
    app.appendChild(wordDiv);

    // Teclado
    const keyboardDiv = createElement('div', { className: 'flex flex-wrap justify-center max-w-lg mx-auto gap-2 mb-4' });

    ALPHABET.forEach(letter => {
        const disabled = guessedLetters.includes(letter) || gameOver || gameWon;
        const btn = createElement('button', {
            className: `w-8 h-8 md:w-10 md:h-10 text-lg font-bold rounded-md transition-colors ${
                disabled ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'
            }`,
            onclick: () => handleLetterClick(letter)
        }, letter);
        keyboardDiv.appendChild(btn);
    });

    app.appendChild(keyboardDiv);

    // Fallos
    app.appendChild(createElement('p', { className: 'text-gray-700 mb-4' }, `Fallos: ${wrongGuesses} / ${MAX_ATTEMPTS}`));

    if (gameOver) {
        app.appendChild(createElement('p', { className: 'text-red-600 font-bold text-xl' }, `💀 ¡Perdiste! Era: ${characterName}`)); // Mensaje actualizado
    }
    if (gameWon) {
        app.appendChild(createElement('p', { className: 'text-green-600 font-bold text-xl' }, `🎉 ¡Ganaste!`));
    }

    if (gameOver || gameWon) {
        const restartBtn = createElement('button', {
            onclick: restartGame,
            className: 'bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 transition-colors mt-4'
        }, 'Jugar otra vez');
        app.appendChild(restartBtn);
    }
}

// Función para manejar la adivinanza del usuario
async function handleLetterClick(letter) {
    if (guessedLetters.includes(letter) || gameOver || gameWon) return;

    guessedLetters.push(letter);

    if (!characterName.includes(letter)) { // Usar characterName
        wrongGuesses++;
        if (wrongGuesses >= MAX_ATTEMPTS) {
            gameOver = true;
            userLose++;
            await saveGameResult(false); // Llamada a saveGameResult
        }
    } else {
        // Verificar si ganó
        const allCorrect = [...characterName].every(l => guessedLetters.includes(l)); // Usar characterName
        if (allCorrect) {
            gameWon = true;
            userWin++;
            await saveGameResult(true); // Llamada a saveGameResult
        }
    }
    render();
}

// Función para obtener un personaje aleatorio de DC Comics
async function fetchRandomDCCharacter() {
    const apiUrl = 'https://akabab.github.io/superhero-api/api/all.json';
    app.innerHTML = '<p class="text-center text-lg text-gray-700">Cargando Personaje DC...</p>'; // Mensaje de carga

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Filtra los personajes de DC Comics y los guarda para el juego
        // Limita a 100 personajes para evitar una lista demasiado grande
        dcCharactersList = data.filter(hero => hero.biography.publisher === 'DC Comics').slice(0, 100);

        if (dcCharactersList.length === 0) {
            showMessage('No se encontraron personajes de DC para el juego.', 'error');
            return;
        }

        // Selecciona un personaje aleatorio de la lista filtrada
        const randomIndex = Math.floor(Math.random() * dcCharactersList.length);
        const selectedCharacter = dcCharactersList[randomIndex];

        characterName = selectedCharacter.name.toUpperCase().replace(/[^A-Z]/g, ''); // Limpiar nombre
        characterId = selectedCharacter.id;
        characterImage = selectedCharacter.images.sm;

    } catch (error) {
        console.error('Error al obtener el personaje de DC:', error);
        app.innerHTML = `<p class="text-red-600 text-center text-xl mt-8">Error al cargar los personajes para el juego: ${error.message}</p>`;
    }
}

// Función para reiniciar el juego
async function restartGame() {
    guessedLetters = [];
    wrongGuesses = 0;
    gameOver = false;
    gameWon = false;
    characterName = '';
    characterId = '';
    characterImage = '';

    await fetchRandomDCCharacter(); // Llama a la función para DC
    render();
}

// Función para cargar los datos del usuario desde Firestore
async function cargarDatosUsuario() {
    if (!uid) return; // Si no hay UID, no hay datos que cargar

    // Ruta consistente para las estadísticas del usuario
    const userStatsDocRef = doc(db, 'artifacts', appId, 'users', uid, 'user_stats', 'stats_doc');
    const docSnap = await getDoc(userStatsDocRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        userWin = data.ganados || 0;
        userLose = data.perdidos || 0;
    } else {
        // Si el documento del usuario no existe, lo creamos con 0 victorias y 0 derrotas
        await setDoc(userStatsDocRef, { ganados: 0, perdidos: 0 });
        userWin = 0;
        userLose = 0;
    }
}

// Función principal que se exporta para ser llamada por main.js
export default function mostrarOriginal() {
    app = document.getElementById("app"); // Asigna la referencia a 'app' aquí

    // Asegura que el contenedor principal esté listo y tenga la estructura base
    app.innerHTML = `
        <div class="container mx-auto p-4 bg-white shadow-lg rounded-lg">
            <h2 class="text-3xl font-bold text-center mb-6 text-indigo-700">Ahorcado de Personajes DC</h2>
            <div id="messageBox" class="p-3 rounded-lg text-white text-center mb-4" style="display: none;"></div>
            <p id="userIdDisplay" class="text-sm text-gray-500 text-center mb-4">ID de Usuario: Cargando...</p>

            <div class="bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto text-center">
                <img id="characterImageDisplay" src="" alt="Character Image" class="w-24 h-24 object-cover rounded-full mx-auto mb-4 border-2 border-blue-300" style="display: none;">
                <p class="text-xl font-semibold mb-4" id="wordDisplay">Cargando...</p>
                <p class="text-gray-700 mb-2" id="remainingGuesses">Intentos restantes: ${MAX_ATTEMPTS}</p>
                <p class="text-gray-700 mb-4" id="guessedLetters">Letras adivinadas: </p>

                <div class="flex justify-center gap-2 mb-4">
                    <input type="text" id="guessInput" maxlength="1" class="border rounded-md p-2 w-20 text-center uppercase" placeholder="A-Z" disabled>
                    <button id="guessButton" class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors" disabled>Adivinar</button>
                </div>
                <button id="newGameButton" class="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 transition-colors">Iniciar Juego</button>
            </div>
        </div>
    `;

    // Asigna las referencias a los elementos del DOM después de que se han creado
    wordDisplay = document.getElementById('wordDisplay');
    guessedLettersDisplay = document.getElementById('guessedLetters');
    remainingGuessesDisplay = document.getElementById('remainingGuesses');
    guessInput = document.getElementById('guessInput');
    guessButton = document.getElementById('guessButton');
    newGameButton = document.getElementById('newGameButton');
    messageBox = document.getElementById('messageBox');
    userIdDisplay = document.getElementById('userIdDisplay');
    characterImageDisplay = document.getElementById('characterImageDisplay');

    // Añade event listeners a los botones
    guessButton.addEventListener('click', handleLetterClick);
    guessInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLetterClick();
        }
    });
    newGameButton.addEventListener('click', restartGame);

    // Configura el listener de autenticación de Firebase.
    // Este listener usará la instancia `auth` importada de tu `firebaseConfig.js`.
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            uid = user.uid; // Asigna el UID del usuario autenticado
            userId = user.uid; // También actualiza userId para saveGameResult
            console.log('Juego de ahorcado: Usuario autenticado:', uid);
            if (userIdDisplay) {
                userIdDisplay.textContent = `ID de Usuario: ${uid}`;
            }
            await cargarDatosUsuario(); // Carga los datos de victorias/derrotas del usuario
            await fetchRandomDCCharacter(); // Carga el primer personaje
            render(); // Renderiza la UI del juego
        } else {
            uid = null;
            userId = null;
            console.log('Juego de ahorcado: Usuario no autenticado.');
            app.innerHTML = '<p class="text-center text-red-600 text-xl mt-8">Por favor inicia sesión para jugar y guardar tus resultados.</p>';
        }
    });
}

