// ============================================================
//  CONFIGURACIÓN DE TU TIENDA — edita estos valores
// ============================================================

export const STORE = {
  // Nombre de tu empresa (aparece en el header)
  nombre: 'Pumas Store',

  // Eslogan corto debajo del nombre
  eslogan: 'Orgullo del baloncesto',

  // ---- PORTADA / HERO ----
  // Titular principal del banner
  heroTitulo: 'Todo el orgullo del baloncesto en un solo lugar',
  // Subtítulo del banner
  heroSubtitulo:
    'Bolsos, ropa y accesorios para jugadores, familias y aficionados. Compra fácil por WhatsApp.',

  // Imagen del banner principal. Pega aquí la URL de tu foto/banner.
  // Recomendado: una foto horizontal (ej. 1600x600). Si lo dejas
  // vacío (''), se muestra un fondo con los colores de la marca.
  heroImagen: '',

  // URL de tu logo. Ponlo en /public o pega un link.
  logoUrl: '/logo.svg',

  // WhatsApp con código de país, SIN + ni espacios. Colombia = 57.
  whatsapp: '573001234567',

  // Texto del punto de recogida (para el método "recoger").
  lugarRecogida: 'la escuela',

  // Moneda
  moneda: 'COP',
  simboloMoneda: '$',

  // ---- COLORES DE MARCA (Pumas: azul oscuro + amarillo) ----
  colores: {
    primario: '#1a2c5b',     // azul oscuro Pumas
    primarioClaro: '#24407f', // azul un poco más claro (degradados)
    acento: '#f5c518',        // amarillo Pumas
    acentoOscuro: '#d9a800',  // amarillo oscuro (hover)
    fondo: '#f7f9fc',         // fondo general suave
    superficie: '#ffffff',    // tarjetas
  },

  // ---- SECCIÓN "¿POR QUÉ COMPRAR CON NOSOTROS?" ----
  beneficios: [
    { icono: '✅', texto: 'Productos de calidad' },
    { icono: '🏀', texto: 'Diseños exclusivos de baloncesto' },
    { icono: '💬', texto: 'Atención personalizada' },
    { icono: '🚚', texto: 'Entregas en Bogotá y envíos nacionales' },
  ],
}
