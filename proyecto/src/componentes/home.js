export default async function mostrarHome() {
    // Obtiene el contenedor principal de la aplicación
    const app = document.getElementById("app");
    // Inicializa el HTML del contenedor con un título y un div para la lista de villanos
    app.innerHTML = `
        <h2 class="text-3xl font-bold text-center mb-6 text-indigo-700">Personajes de DC Comics</h2>
        <div id="villainList" class="flex flex-wrap justify-center gap-6 p-4"></div>
    `;

    // Obtiene el div donde se listarán los villanos
    const villainListDiv = document.getElementById("villainList");
    // URL de la API de superhéroes
    const apiUrl = 'https://akabab.github.io/superhero-api/api/all.json';

    try {
        // Realiza la solicitud a la API usando async/await
        const response = await fetch(apiUrl);
        // Verifica si la respuesta fue exitosa
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Filtra los personajes para obtener solo los de DC Comics
        // Limita la carga a los primeros 100 personajes
        const dcCharacters = data.filter(hero => hero.biography.publisher === 'DC Comics').slice(0, 100);

        // Itera sobre cada personaje de DC y crea su tarjeta
        dcCharacters.forEach(character => {
            // Crea el elemento div para la tarjeta del personaje
            const characterCard = document.createElement('div');
            // Añade clases de Tailwind para estilizar la tarjeta
            // Las clases de ancho (w-full, sm:w-1/2, etc.) aseguran que se muestren varios por fila
            // dependiendo del tamaño de la pantalla.
            characterCard.classList.add(
                'villain-card',
                'bg-white',
                'p-4',
                'rounded-lg',
                'shadow-md',
                'text-center',
                'w-full',        // Ancho completo en pantallas muy pequeñas
                'sm:w-1/2',      // Dos por fila en pantallas pequeñas
                'md:w-1/3',      // Tres por fila en pantallas medianas
                'lg:w-1/4',      // Cuatro por fila en pantallas grandes
                'xl:w-1/5',      // Cinco por fila en pantallas extra grandes
                'flex',
                'flex-col',
                'items-center',
                'transform',
                'hover:scale-105',
                'transition-transform',
                'duration-200'
            );

            // Crea el enlace para el nombre del personaje
            const nameLink = document.createElement('a');
            nameLink.href = `villain_details.html?id=${character.id}`; // Enlace a la página de detalles
            nameLink.textContent = character.name; // Texto del enlace
            nameLink.target = '_blank'; // Abre en una nueva pestaña
            nameLink.classList.add('text-lg', 'font-semibold', 'text-blue-600', 'hover:underline', 'mb-2');

            // Crea el encabezado para el nombre y añade el enlace
            const nameHeading = document.createElement('h3');
            nameHeading.appendChild(nameLink);

            // Crea el elemento de imagen
            const imageElement = document.createElement('img');
            imageElement.src = character.images.sm; // URL de la imagen pequeña
            imageElement.alt = character.name; // Texto alternativo para la imagen
            // Añade clases de Tailwind para estilizar la imagen
            imageElement.classList.add('w-32', 'h-32', 'object-cover', 'rounded-full', 'mb-4', 'border-2', 'border-blue-300');
            // Añade un manejador de errores para la imagen
            imageElement.onerror = (e) => {
                e.target.src = 'https://placehold.co/128x128/cccccc/333333?text=No+Image'; // Imagen de fallback
            };

            // Crea el párrafo de descripción (actualmente vacío, como en tu código original)
            const descriptionParagraph = document.createElement('p');
            descriptionParagraph.classList.add('text-sm', 'text-gray-600');
            // descriptionParagraph.textContent = `Nombre Real: ${character.biography['full-name'] || 'No disponible'}`; // Si quieres activarlo

            // Añade los elementos a la tarjeta del personaje
            characterCard.appendChild(nameHeading);
            characterCard.appendChild(imageElement);
            characterCard.appendChild(descriptionParagraph);

            // Añade la tarjeta al contenedor de la lista de villanos
            villainListDiv.appendChild(characterCard);
        });
    } catch (error) {
        // Manejo de errores: muestra un mensaje en el contenedor principal
        console.error('Error al obtener los datos de la API:', error);
        app.innerHTML = `<p class="text-red-600 text-center text-xl mt-8">Error al cargar los personajes: ${error.message}</p>`;
    }
}

// Llama a la función principal para mostrar los personajes cuando la ventana se carga
window.onload = mostrarHome;
