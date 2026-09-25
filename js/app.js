// js/app.js

// ----------------------------------------------------
// CONFIGURACIÓN DE GEOFENCING (GPS) Y CACHE
// ----------------------------------------------------

const LATITUD_OFICINA = 16.76827;
const LONGITUD_OFICINA = -93.13401;
const RANGO_MAXIMO_METROS = 5000;

let modelosCargados = false;
let tipoOperacion = null; // 'entrada' o 'salida'
let streamCamara = null;
const cacheDescriptoresOficiales = new Map();

function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// GPS Rápido (Máximo 2 segundos de timeout)
function obtenerUbicacionRapida() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const dist = calcularDistanciaMetros(pos.coords.latitude, pos.coords.longitude, LATITUD_OFICINA, LONGITUD_OFICINA);
                resolve({
                    valido: dist <= RANGO_MAXIMO_METROS,
                    distanciaMetros: Math.round(dist),
                    latitud: pos.coords.latitude,
                    longitud: pos.coords.longitude
                });
            },
            () => resolve(null), 
            { enableHighAccuracy: false, timeout: 2000, maximumAge: 300000 }
        );
    });
}

// ----------------------------------------------------
// CÁMARA Y IA ULTRA RÁPIDA (ANTI-CONGELAMIENTO)
// ----------------------------------------------------

async function cargarModelosFaciales() {
    try {
        console.log("Cargando motor facial ultra rápido...");
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        modelosCargados = true;
        console.log("Motor de IA listo.");
    } catch (err) {
        console.error('Error cargando modelos tiny:', err);
    }
}

async function encenderCamara() {
    const video = document.getElementById('camara-preview');
    if (streamCamara) apagarCamara();

    try {
        streamCamara = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'user', 
                width: { ideal: 320 }, 
                height: { ideal: 320 } 
            },
            audio: false
        });

        video.srcObject = streamCamara;
        await video.play();
    } catch (err) {
        console.error('Error al encender cámara:', err);
        throw new Error('No se pudo activar la cámara.');
    }
}

function apagarCamara() {
    if (streamCamara) {
        streamCamara.getTracks().forEach(track => track.stop());
        streamCamara = null;
    }
}

async function asegurarCamaraActiva() {
    const video = document.getElementById('camara-preview');
    if (!video || video.paused || video.ended || video.readyState < 2) {
        await encenderCamara();
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

async function obtenerDescriptorOficial(fotoOficialUrl) {
    if (cacheDescriptoresOficiales.has(fotoOficialUrl)) {
        return cacheDescriptoresOficiales.get(fotoOficialUrl);
    }

    const imgOficial = await faceapi.fetchImage(fotoOficialUrl);
    const deteccion = await faceapi.detectSingleFace(imgOficial, new faceapi.TinyFaceDetectorOptions({ inputSize: 128 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor();

    if (!deteccion) throw new Error('La foto oficial registrada no contiene un rostro claro.');

    cacheDescriptoresOficiales.set(fotoOficialUrl, deteccion.descriptor);
    return deteccion.descriptor;
}

function capturarFrameReducido() {
    const video = document.getElementById('camara-preview');
    const canvasTemp = document.createElement('canvas');
    canvasTemp.width = 160;
    canvasTemp.height = 160;
    const ctx = canvasTemp.getContext('2d');

    if (video.videoWidth > 0 && video.videoHeight > 0) {
        ctx.drawImage(video, 0, 0, canvasTemp.width, canvasTemp.height);
    }
    return canvasTemp;
}

async function validarRostroExpress(fotoOficialUrl) {
    if (!modelosCargados) throw new Error('Cargando motor de IA facial...');

    await asegurarCamaraActiva();

    const framePequeño = capturarFrameReducido();
    const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.4 });

    const [deteccionEnVivo, descriptorOficial] = await Promise.all([
        faceapi.detectSingleFace(framePequeño, detectorOptions).withFaceLandmarks(true).withFaceDescriptor(),
        obtenerDescriptorOficial(fotoOficialUrl)
    ]);

    if (!deteccionEnVivo) throw new Error('No se detecta un rostro en el círculo.');

    const distancia = faceapi.euclideanDistance(deteccionEnVivo.descriptor, descriptorOficial);
    return distancia < 0.55;
}

function tomarFotografiaBlob() {
    return new Promise((resolve) => {
        const video = document.getElementById('camara-preview');
        const canvas = document.getElementById('foto-canvas');

        if (!video || !video.srcObject) return resolve(null);

        canvas.width = 320;
        canvas.height = 320;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.4);
    });
}

// ----------------------------------------------------
// MANEJO DE RELOJ DIGITAL Y EVENTOS DE INTERFAZ
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    iniciarRelojDigital();
    cargarModelosFaciales();

    document.getElementById('btn-iniciar-entrada')?.addEventListener('click', () => abrirEscaner('entrada'));
    document.getElementById('btn-iniciar-salida')?.addEventListener('click', () => abrirEscaner('salida'));
    document.getElementById('btn-cancelar-escaner')?.addEventListener('click', cerrarEscaner);
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !document.getElementById('modal-escaner').classList.contains('hidden')) {
        asegurarCamaraActiva();
    }
});

function iniciarRelojDigital() {
    const reloj = document.getElementById('reloj-digital');
    setInterval(() => {
        const ahora = new Date();
        const h = String(ahora.getHours()).padStart(2, '0');
        const m = String(ahora.getMinutes()).padStart(2, '0');
        const s = String(ahora.getSeconds()).padStart(2, '0');
        if (reloj) reloj.innerText = `${h}:${m}:${s}`;
    }, 1000);
}

// ----------------------------------------------------
// FLUJO Y FEEDBACK ESTILO ELEKTRA
// ----------------------------------------------------

async function abrirEscaner(tipo) {
    const matricula = document.getElementById('asistencia-matricula').value.trim();
    if (!matricula) return alert('Por favor ingresa tu matrícula primero.');

    tipoOperacion = tipo;
    const modal = document.getElementById('modal-escaner');
    const titulo = document.getElementById('modal-titulo');

    titulo.innerText = tipo === 'entrada' ? 'Verificando Entrada' : 'Verificando Salida';
    ocultarOverlayStatus();
    modal.classList.remove('hidden');

    try {
        await encenderCamara();
        // Esperar 1 segundo para estabilizar la cámara e iniciar el escaneo
        setTimeout(() => procesarRegistro(), 1000);
    } catch (err) {
        mostrarStatusFeedback(false, err.message);
        setTimeout(cerrarEscaner, 2500);
    }
}

function cerrarEscaner() {
    apagarCamara();
    document.getElementById('modal-escaner').classList.add('hidden');
    ocultarOverlayStatus();
}

function mostrarStatusFeedback(exito, mensaje) {
    const overlay = document.getElementById('overlay-status');
    const icon = document.getElementById('status-icon');
    const msg = document.getElementById('status-message');

    overlay.classList.remove('hidden');
    if (exito) {
        icon.innerText = '✅';
        msg.className = 'text-sm font-semibold text-center px-4 text-emerald-400';
    } else {
        icon.innerText = '❌';
        msg.className = 'text-sm font-semibold text-center px-4 text-rose-400';
    }
    msg.innerText = mensaje;
}

function ocultarOverlayStatus() {
    document.getElementById('overlay-status')?.classList.add('hidden');
}

// ----------------------------------------------------
// PROCESO DE REGISTRO
// ----------------------------------------------------

async function procesarRegistro() {
    const client = window.supabaseClient;
    const matricula = document.getElementById('asistencia-matricula').value.trim();
    const ahora = new Date();
    const hoy = ahora.toISOString().split('T')[0];
    const horaActualStr = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}:${String(ahora.getSeconds()).padStart(2, '0')}`;

    try {
        // 1. Obtener datos del alumno
        const { data: alumno } = await client
            .from('alumnos')
            .select('id, nombre_completo, foto_perfil_url, horas_acumuladas')
            .eq('matricula', matricula)
            .maybeSingle();

        if (!alumno) throw new Error('Matrícula no encontrada.');
        if (!alumno.foto_perfil_url) throw new Error('No tienes foto oficial registrada.');

        // 2. Reconocimiento Facial + GPS en paralelo
        const [coincideRostro, ubicacion] = await Promise.all([
            validarRostroExpress(alumno.foto_perfil_url),
            obtenerUbicacionRapida()
        ]);

        if (!coincideRostro) throw new Error('No eres la persona autorizada para esta matrícula.');
        if (ubicacion && !ubicacion.valido) throw new Error(`Fuera del rango de la oficina (${ubicacion.distanciaMetros}m).`);

        const blobFoto = await tomarFotografiaBlob();

        if (tipoOperacion === 'entrada') {
            const { error } = await client.from('asistencias').insert([{
                alumno_id: alumno.id,
                fecha: hoy,
                hora_entrada: horaActualStr,
                latitud: ubicacion ? ubicacion.latitud : null,
                longitud: ubicacion ? ubicacion.longitud : null
            }]);

            if (error) throw new Error('Ya registraste tu entrada el día de hoy.');

            mostrarStatusFeedback(true, `¡Entrada Registrada!\n${alumno.nombre_completo}`);

            if (blobFoto) {
                const nombreArchivo = `foto_${alumno.id}_entrada_${Date.now()}.jpg`;
                client.storage.from('asistencias-fotos').upload(nombreArchivo, blobFoto, { contentType: 'image/jpeg' });
            }

        } else if (tipoOperacion === 'salida') {
            const { data: asistencias } = await client
                .from('asistencias')
                .select('*')
                .eq('alumno_id', alumno.id)
                .eq('fecha', hoy)
                .is('hora_salida', null)
                .limit(1);

            if (!asistencias || asistencias.length === 0) throw new Error('No tienes entrada pendiente hoy.');

            const asistencia = asistencias[0];
            const [hEnt, mEnt] = asistencia.hora_entrada.split(':').map(Number);
            const [hSal, mSal] = horaActualStr.split(':').map(Number);
            const horasTrabajadas = parseFloat((((hSal * 60 + mSal) - (hEnt * 60 + mEnt)) / 60).toFixed(2));

            if (horasTrabajadas <= 0) throw new Error('Hora de salida no válida.');

            await client.from('asistencias').update({
                hora_salida: horaActualStr,
                horas_trabajadas: horasTrabajadas,
                latitud: ubicacion ? ubicacion.latitud : null,
                longitud: ubicacion ? ubicacion.longitud : null
            }).eq('id', asistencia.id);

            const nuevasHoras = parseFloat(alumno.horas_acumuladas || 0) + horasTrabajadas;
            await client.from('alumnos').update({ horas_acumuladas: nuevasHoras }).eq('id', alumno.id);

            mostrarStatusFeedback(true, `¡Salida Registrada!\n+${horasTrabajadas} hrs`);

            if (blobFoto) {
                const nombreArchivo = `foto_${alumno.id}_salida_${Date.now()}.jpg`;
                client.storage.from('asistencias-fotos').upload(nombreArchivo, blobFoto, { contentType: 'image/jpeg' });
            }
        }

        // Limpieza y reseteo
        document.getElementById('asistencia-matricula').value = '';
        setTimeout(cerrarEscaner, 2500);

    } catch (err) {
        mostrarStatusFeedback(false, err.message || err);
        setTimeout(cerrarEscaner, 3000);
    }
}