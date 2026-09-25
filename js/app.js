// js/app.js

// ----------------------------------------------------
// CONFIGURACIÓN DE GEOFENCING (GPS) Y CACHE
// ----------------------------------------------------

const LATITUD_OFICINA = 16.76827;
const LONGITUD_OFICINA = -93.13401;
const RANGO_MAXIMO_METROS = 5000;

let modelosCargados = false;
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
let streamCamara = null;

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

async function iniciarCamara() {
    const video = document.getElementById('camara-preview');
    const placeholder = document.getElementById('camara-placeholder');

    // Limpia streams anteriores para evitar congelamientos en memoria
    if (streamCamara) {
        streamCamara.getTracks().forEach(track => track.stop());
    }

    try {
        streamCamara = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'user', 
                width: { ideal: 320 }, 
                height: { ideal: 240 } 
            },
            audio: false
        });

        video.srcObject = streamCamara;

        // Asegura reproducción contínua en móviles
        video.onloadedmetadata = () => {
            video.play().catch(e => console.error("Error al reanudar video:", e));
            if (placeholder) placeholder.style.display = 'none';
        };

    } catch (err) {
        console.error('Error al encender cámara:', err);
    }
}

// Verifica si el video se pausó y lo reactiva dinámicamente
async function asegurarCamaraActiva() {
    const video = document.getElementById('camara-preview');
    if (!video || video.paused || video.ended || video.readyState < 2) {
        console.warn("Cámara inactiva o congelada. Reactivando...");
        await iniciarCamara();
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

// Captura un fotograma independiente para no bloquear el feed de la cámara
function capturarFrameReducido() {
    const video = document.getElementById('camara-preview');
    const canvasTemp = document.createElement('canvas');
    canvasTemp.width = 160;
    canvasTemp.height = 120;
    const ctx = canvasTemp.getContext('2d');

    if (video.videoWidth > 0 && video.videoHeight > 0) {
        ctx.drawImage(video, 0, 0, canvasTemp.width, canvasTemp.height);
    }
    return canvasTemp;
}

async function validarRostroExpress(fotoOficialUrl) {
    if (!modelosCargados) throw new Error('Iniciando IA facial, por favor presiona de nuevo en un segundo...');

    // Reactivar cámara si el navegador del móvil la pausó
    await asegurarCamaraActiva();

    const framePequeño = capturarFrameReducido();
    const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.4 });

    // Detección facial + descarga/cacheo de foto en paralelo
    const [deteccionEnVivo, descriptorOficial] = await Promise.all([
        faceapi.detectSingleFace(framePequeño, detectorOptions).withFaceLandmarks(true).withFaceDescriptor(),
        obtenerDescriptorOficial(fotoOficialUrl)
    ]);

    if (!deteccionEnVivo) throw new Error('No se detecta rostro frente a la cámara.');

    const distancia = faceapi.euclideanDistance(deteccionEnVivo.descriptor, descriptorOficial);
    return distancia < 0.55;
}

function tomarFotografiaBlob() {
    return new Promise((resolve) => {
        const video = document.getElementById('camara-preview');
        const canvas = document.getElementById('foto-canvas');

        if (!video || !video.srcObject) return resolve(null);

        canvas.width = 320;
        canvas.height = 240;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.4);
    });
}

// ----------------------------------------------------
// EVENTOS Y REGISTRO INSTANTÁNEO
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    actualizarHoraActual();
    iniciarCamara();
    cargarModelosFaciales();

    document.getElementById('btn-entrada')?.addEventListener('click', registrarEntradaAlumno);
    document.getElementById('btn-salida')?.addEventListener('click', registrarSalidaAlumno);
});

// Reactiva la cámara cuando el usuario regresa a la pestaña o app
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        asegurarCamaraActiva();
    }
});

function actualizarHoraActual() {
    const horaInput = document.getElementById('asistencia-hora');
    if (horaInput) {
        const ahora = new Date();
        horaInput.value = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    }
}

// REGISTRAR ENTRADA
async function registrarEntradaAlumno() {
    const client = window.supabaseClient;
    const matricula = document.getElementById('asistencia-matricula').value.trim();
    let hora_entrada = document.getElementById('asistencia-hora').value;
    const hoy = new Date().toISOString().split('T')[0];

    if (!matricula) return alert('Ingresa tu matrícula.');

    const btn = document.getElementById('btn-entrada');
    if (btn) btn.innerText = '⚡ Procesando...';

    try {
        // 1. Obtener Alumno
        const { data: alumno } = await client
            .from('alumnos')
            .select('id, nombre_completo, foto_perfil_url')
            .eq('matricula', matricula)
            .maybeSingle();

        if (!alumno) throw new Error('Matrícula no encontrada.');
        if (!alumno.foto_perfil_url) throw new Error('No tienes foto oficial registrada.');

        // 2. Validar Facial + GPS simultáneo
        const [coincideRostro, ubicacion] = await Promise.all([
            validarRostroExpress(alumno.foto_perfil_url),
            obtenerUbicacionRapida()
        ]);

        if (!coincideRostro) throw new Error(`El rostro no coincide con ${alumno.nombre_completo}.`);
        if (ubicacion && !ubicacion.valido) throw new Error(`Estás fuera del rango de la oficina (${ubicacion.distanciaMetros}m).`);

        if (hora_entrada && hora_entrada.split(':').length === 2) hora_entrada += ':00';

        // Capturar foto antes del registro DB
        const blobFoto = await tomarFotografiaBlob();

        // 3. Insertar asistencia
        const { error } = await client.from('asistencias').insert([{
            alumno_id: alumno.id,
            fecha: hoy,
            hora_entrada: hora_entrada,
            latitud: ubicacion ? ubicacion.latitud : null,
            longitud: ubicacion ? ubicacion.longitud : null
        }]);

        if (error) {
            alert('Ya registraste tu entrada el día de hoy.');
        } else {
            alert(`✅ ¡Entrada registrada con éxito!\nBienvenido/a ${alumno.nombre_completo}.`);
            document.getElementById('asistencia-matricula').value = '';

            // Subir foto en segundo plano
            if (blobFoto) {
                const nombreArchivo = `foto_${alumno.id}_entrada_${Date.now()}.jpg`;
                client.storage.from('asistencias-fotos').upload(nombreArchivo, blobFoto, { contentType: 'image/jpeg' });
            }
        }
    } catch (err) {
        alert(`❌ ${err.message || err}`);
    } finally {
        if (btn) btn.innerText = 'REGISTRAR ENTRADA';
        actualizarHoraActual();
    }
}

// REGISTRAR SALIDA
async function registrarSalidaAlumno() {
    const client = window.supabaseClient;
    const matricula = document.getElementById('asistencia-matricula').value.trim();
    let hora_salida = document.getElementById('asistencia-hora').value;
    const hoy = new Date().toISOString().split('T')[0];

    if (!matricula) return alert('Ingresa tu matrícula.');

    const btn = document.getElementById('btn-salida');
    if (btn) btn.innerText = '⚡ Procesando...';

    try {
        const { data: alumno } = await client
            .from('alumnos')
            .select('id, nombre_completo, horas_acumuladas, foto_perfil_url')
            .eq('matricula', matricula)
            .maybeSingle();

        if (!alumno) throw new Error('Matrícula no encontrada.');
        if (!alumno.foto_perfil_url) throw new Error('No tienes foto oficial registrada.');

        const [coincideRostro, ubicacion] = await Promise.all([
            validarRostroExpress(alumno.foto_perfil_url),
            obtenerUbicacionRapida()
        ]);

        if (!coincideRostro) throw new Error(`El rostro no coincide con ${alumno.nombre_completo}.`);

        if (hora_salida && hora_salida.split(':').length === 2) hora_salida += ':00';

        const { data: asistencias } = await client
            .from('asistencias')
            .select('*')
            .eq('alumno_id', alumno.id)
            .eq('fecha', hoy)
            .is('hora_salida', null)
            .limit(1);

        if (!asistencias || asistencias.length === 0) throw new Error('No tienes entrada pendiente registrada hoy.');

        const asistencia = asistencias[0];
        const [hEnt, mEnt] = asistencia.hora_entrada.split(':').map(Number);
        const [hSal, mSal] = hora_salida.split(':').map(Number);
        const horasTrabajadas = parseFloat((((hSal * 60 + mSal) - (hEnt * 60 + mEnt)) / 60).toFixed(2));

        if (horasTrabajadas <= 0) throw new Error('La hora de salida no puede ser igual o menor a la de entrada.');

        const blobFoto = await tomarFotografiaBlob();

        await client.from('asistencias').update({
            hora_salida: hora_salida,
            horas_trabajadas: horasTrabajadas,
            latitud: ubicacion ? ubicacion.latitud : null,
            longitud: ubicacion ? ubicacion.longitud : null
        }).eq('id', asistencia.id);

        const nuevasHoras = parseFloat(alumno.horas_acumuladas || 0) + horasTrabajadas;
        await client.from('alumnos').update({ horas_acumuladas: nuevasHoras }).eq('id', alumno.id);

        alert(`✅ ¡Salida registrada!\n+${horasTrabajadas} hrs para ${alumno.nombre_completo}.`);
        document.getElementById('asistencia-matricula').value = '';

        if (blobFoto) {
            const nombreArchivo = `foto_${alumno.id}_salida_${Date.now()}.jpg`;
            client.storage.from('asistencias-fotos').upload(nombreArchivo, blobFoto, { contentType: 'image/jpeg' });
        }
    } catch (err) {
        alert(`❌ ${err.message || err}`);
    } finally {
        if (btn) btn.innerText = 'REGISTRAR SALIDA';
        actualizarHoraActual();
    }
}