// js/app.js

// =====================================================
// CONFIGURACIÓN DE UBICACIÓN
// =====================================================

const LATITUD_OFICINA = 16.76827;
const LONGITUD_OFICINA = -93.13401;
const RANGO_MAXIMO_METROS = 5000;


// =====================================================
// VARIABLES GLOBALES
// =====================================================

let modelosCargados = false;
let tipoOperacion = null;
let streamCamara = null;
let controlHorario = null;

const cacheDescriptoresOficiales = new Map();


// =====================================================
// CONTEXTO DEL CONTROL
// =====================================================

function leerContextoControl() {

    try {

        const raw =
            sessionStorage.getItem(
                "horario_control"
            );

        if (!raw) {
            return null;
        }

        return JSON.parse(raw);

    } catch (error) {

        console.error(
            "No se pudo leer la configuración del control:",
            error
        );

        return null;

    }

}


// =====================================================
// MARCA DE LA ORGANIZACIÓN
// =====================================================

function aplicarMarcaOrganizacion() {

    if (!controlHorario) {
        return;
    }


    const color =
        controlHorario.color_principal ||
        "#00A3E0";


    const nombre =
        controlHorario.nombre ||
        "Control de horario";


    const tipo =
        controlHorario.tipo ||
        "Organización";


    const identificador =
        controlHorario.nombre_identificador ||
        "Matrícula";


    const nombreEl =
        document.getElementById(
            "empresa-nombre"
        );


    const tipoEl =
        document.getElementById(
            "empresa-tipo"
        );


    const labelEl =
        document.getElementById(
            "identificador-label"
        );


    const inputEl =
        document.getElementById(
            "asistencia-matricula"
        );


    const btnEntrada =
        document.getElementById(
            "btn-iniciar-entrada"
        );


    const camaraCirculo =
        document.getElementById(
            "camara-circulo"
        );


    const logo =
        document.getElementById(
            "empresa-logo"
        );


    if (nombreEl) {

        nombreEl.textContent =
            nombre;

        nombreEl.style.color =
            color;

    }


    if (tipoEl) {

        tipoEl.textContent =
            tipo;

    }


    if (labelEl) {

        labelEl.textContent =
            `Ingresa tu ${identificador}`;

    }


    if (inputEl) {

        inputEl.placeholder =
            identificador;

    }


    if (btnEntrada) {

        btnEntrada.style.backgroundColor =
            color;

    }


    if (camaraCirculo) {

        camaraCirculo.style.borderColor =
            color;

    }


    if (
        logo &&
        controlHorario.logo_url
    ) {

        logo.src =
            controlHorario.logo_url;

        logo.classList.remove(
            "hidden"
        );

    }

}


// =====================================================
// CERRAR CONTROL
// =====================================================

function cerrarControlHorario() {

    apagarCamara();

    sessionStorage.removeItem(
        "horario_control"
    );

    window.location.replace(
        "index.html"
    );

}


// =====================================================
// DISTANCIA GPS
// =====================================================

function calcularDistanciaMetros(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R = 6371000;


    const dLat =
        (lat2 - lat1) *
        Math.PI /
        180;


    const dLon =
        (lon2 - lon1) *
        Math.PI /
        180;


    const a =

        Math.sin(
            dLat / 2
        ) *

        Math.sin(
            dLat / 2
        ) +

        Math.cos(
            lat1 *
            Math.PI /
            180
        ) *

        Math.cos(
            lat2 *
            Math.PI /
            180
        ) *

        Math.sin(
            dLon / 2
        ) *

        Math.sin(
            dLon / 2
        );


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(
                1 - a
            )
        );


    return R * c;

}


// =====================================================
// OBTENER UBICACIÓN
// =====================================================

function obtenerUbicacionRapida() {

    return new Promise(
        (resolve) => {

            if (
                !navigator.geolocation
            ) {

                return resolve(
                    null
                );

            }


            navigator.geolocation
                .getCurrentPosition(

                    (pos) => {

                        const dist =
                            calcularDistanciaMetros(

                                pos.coords.latitude,

                                pos.coords.longitude,

                                LATITUD_OFICINA,

                                LONGITUD_OFICINA

                            );


                        resolve({

                            valido:
                                dist <=
                                RANGO_MAXIMO_METROS,

                            distanciaMetros:
                                Math.round(
                                    dist
                                ),

                            latitud:
                                pos.coords.latitude,

                            longitud:
                                pos.coords.longitude

                        });

                    },


                    () => {

                        resolve(
                            null
                        );

                    },


                    {

                        enableHighAccuracy:
                            false,

                        timeout:
                            2000,

                        maximumAge:
                            300000

                    }

                );

        }
    );

}


// =====================================================
// MODELOS FACIALES
// =====================================================

async function cargarModelosFaciales() {

    try {

        console.log(
            "Cargando motor facial..."
        );


        await faceapi
            .nets
            .tinyFaceDetector
            .loadFromUri(
                "/models"
            );


        await faceapi
            .nets
            .faceLandmark68TinyNet
            .loadFromUri(
                "/models"
            );


        await faceapi
            .nets
            .faceRecognitionNet
            .loadFromUri(
                "/models"
            );


        modelosCargados =
            true;


        console.log(
            "Motor de IA listo."
        );

    } catch (err) {

        console.error(
            "Error cargando modelos:",
            err
        );

    }

}


// =====================================================
// CÁMARA
// =====================================================

async function encenderCamara() {

    const video =
        document.getElementById(
            "camara-preview"
        );


    if (
        streamCamara
    ) {

        apagarCamara();

    }


    try {

        streamCamara =
            await navigator.mediaDevices
                .getUserMedia({

                    video: {

                        facingMode:
                            "user",

                        width: {
                            ideal: 320
                        },

                        height: {
                            ideal: 320
                        }

                    },

                    audio:
                        false

                });


        video.srcObject =
            streamCamara;


        await video.play();

    } catch (err) {

        console.error(
            "Error al encender cámara:",
            err
        );


        throw new Error(
            "No se pudo activar la cámara."
        );

    }

}


function apagarCamara() {

    if (
        streamCamara
    ) {

        streamCamara
            .getTracks()
            .forEach(
                (track) =>
                    track.stop()
            );


        streamCamara =
            null;

    }

}


async function asegurarCamaraActiva() {

    const video =
        document.getElementById(
            "camara-preview"
        );


    if (
        !video ||
        video.paused ||
        video.ended ||
        video.readyState < 2
    ) {

        await encenderCamara();


        await new Promise(
            (resolve) =>
                setTimeout(
                    resolve,
                    300
                )
        );

    }

}


// =====================================================
// FOTO OFICIAL / RECONOCIMIENTO
// =====================================================

async function obtenerDescriptorOficial(
    fotoOficialUrl
) {

    if (!fotoOficialUrl) {

        throw new Error(
            "No tienes foto oficial registrada."
        );

    }


    if (
        cacheDescriptoresOficiales
            .has(
                fotoOficialUrl
            )
    ) {

        return cacheDescriptoresOficiales
            .get(
                fotoOficialUrl
            );

    }


    const imgOficial =
        await faceapi
            .fetchImage(
                fotoOficialUrl
            );


    const deteccion =
        await faceapi
            .detectSingleFace(

                imgOficial,

                new faceapi
                    .TinyFaceDetectorOptions({

                        inputSize:
                            128

                    })

            )
            .withFaceLandmarks(
                true
            )
            .withFaceDescriptor();


    if (
        !deteccion
    ) {

        throw new Error(
            "La foto oficial registrada no contiene un rostro claro."
        );

    }


    cacheDescriptoresOficiales
        .set(

            fotoOficialUrl,

            deteccion.descriptor

        );


    return deteccion.descriptor;

}


// =====================================================
// FRAME DE CÁMARA
// =====================================================

function capturarFrameReducido() {

    const video =
        document.getElementById(
            "camara-preview"
        );


    const canvasTemp =
        document.createElement(
            "canvas"
        );


    canvasTemp.width =
        160;


    canvasTemp.height =
        160;


    const ctx =
        canvasTemp.getContext(
            "2d"
        );


    if (
        video.videoWidth > 0 &&
        video.videoHeight > 0
    ) {

        ctx.drawImage(

            video,

            0,

            0,

            canvasTemp.width,

            canvasTemp.height

        );

    }


    return canvasTemp;

}


// =====================================================
// VALIDACIÓN FACIAL
// =====================================================

async function validarRostroExpress(
    fotoOficialUrl
) {

    if (
        !modelosCargados
    ) {

        throw new Error(
            "Cargando motor de IA facial..."
        );

    }


    if (!fotoOficialUrl) {

        throw new Error(
            "No tienes foto oficial registrada."
        );

    }


    await asegurarCamaraActiva();


    const framePequeño =
        capturarFrameReducido();


    const detectorOptions =
        new faceapi
            .TinyFaceDetectorOptions({

                inputSize:
                    128,

                scoreThreshold:
                    0.4

            });


    const [
        deteccionEnVivo,
        descriptorOficial
    ] = await Promise.all([

        faceapi
            .detectSingleFace(
                framePequeño,
                detectorOptions
            )
            .withFaceLandmarks(
                true
            )
            .withFaceDescriptor(),

        obtenerDescriptorOficial(
            fotoOficialUrl
        )

    ]);


    if (
        !deteccionEnVivo
    ) {

        throw new Error(
            "No se detecta un rostro en el círculo."
        );

    }


    const distancia =
        faceapi.euclideanDistance(

            deteccionEnVivo.descriptor,

            descriptorOficial

        );


    return distancia < 0.55;

}


// =====================================================
// CAPTURAR FOTO DE ASISTENCIA
// =====================================================

function tomarFotografiaBlob() {

    return new Promise(
        (resolve) => {

            const video =
                document.getElementById(
                    "camara-preview"
                );


            const canvas =
                document.getElementById(
                    "foto-canvas"
                );


            if (
                !video ||
                !video.srcObject
            ) {

                return resolve(
                    null
                );

            }


            canvas.width =
                320;


            canvas.height =
                320;


            const context =
                canvas.getContext(
                    "2d"
                );


            context.drawImage(

                video,

                0,

                0,

                canvas.width,

                canvas.height

            );


            canvas.toBlob(

                (blob) =>
                    resolve(
                        blob
                    ),

                "image/jpeg",

                0.4

            );

        }
    );

}


// =====================================================
// RELOJ
// =====================================================

function iniciarRelojDigital() {

    const reloj =
        document.getElementById(
            "reloj-digital"
        );


    function actualizar() {

        const ahora =
            new Date();


        const h =
            String(
                ahora.getHours()
            )
            .padStart(
                2,
                "0"
            );


        const m =
            String(
                ahora.getMinutes()
            )
            .padStart(
                2,
                "0"
            );


        const s =
            String(
                ahora.getSeconds()
            )
            .padStart(
                2,
                "0"
            );


        if (
            reloj
        ) {

            reloj.innerText =
                `${h}:${m}:${s}`;

        }

    }


    actualizar();


    setInterval(
        actualizar,
        1000
    );

}


// =====================================================
// ESCÁNER
// =====================================================

async function abrirEscaner(
    tipo
) {

    const input =
        document.getElementById(
            "asistencia-matricula"
        );


    const identificador =
        input
            ?.value
            .trim();


    const nombreIdentificador =
        controlHorario
            ?.nombre_identificador ||
        "identificador";


    if (
        !identificador
    ) {

        return alert(
            `Por favor ingresa tu ${nombreIdentificador} primero.`
        );

    }


    tipoOperacion =
        tipo;


    const modal =
        document.getElementById(
            "modal-escaner"
        );


    const titulo =
        document.getElementById(
            "modal-titulo"
        );


    if (titulo) {

        titulo.innerText =
            tipo === "entrada"
                ? "Verificando Entrada"
                : "Verificando Salida";

    }


    ocultarOverlayStatus();


    modal
        ?.classList
        .remove(
            "hidden"
        );


    try {

        await encenderCamara();


        setTimeout(
            () =>
                procesarRegistro(),
            1000
        );

    } catch (err) {

        mostrarStatusFeedback(
            false,
            err.message
        );


        setTimeout(
            cerrarEscaner,
            2500
        );

    }

}


function cerrarEscaner() {

    apagarCamara();


    document
        .getElementById(
            "modal-escaner"
        )
        ?.classList
        .add(
            "hidden"
        );


    ocultarOverlayStatus();

}


// =====================================================
// MENSAJES
// =====================================================

function mostrarStatusFeedback(
    exito,
    mensaje
) {

    const overlay =
        document.getElementById(
            "overlay-status"
        );


    const icon =
        document.getElementById(
            "status-icon"
        );


    const msg =
        document.getElementById(
            "status-message"
        );


    if (
        !overlay ||
        !icon ||
        !msg
    ) {
        return;
    }


    overlay
        .classList
        .remove(
            "hidden"
        );


    if (
        exito
    ) {

        icon.innerText =
            "✅";


        msg.className =
            "text-sm font-semibold text-center px-4 text-emerald-400";

    } else {

        icon.innerText =
            "❌";


        msg.className =
            "text-sm font-semibold text-center px-4 text-rose-400";

    }


    msg.innerText =
        mensaje;

}


function ocultarOverlayStatus() {

    document
        .getElementById(
            "overlay-status"
        )
        ?.classList
        .add(
            "hidden"
        );

}


// =====================================================
// SUBIR FOTO DE ASISTENCIA
// =====================================================

async function subirFotoAsistencia(
    client,
    alumnoId,
    tipo,
    blobFoto
) {

    if (
        !blobFoto ||
        !navigator.onLine
    ) {

        return;

    }


    const nombreArchivo =
        `foto_${alumnoId}_${tipo}_${Date.now()}.jpg`;


    const {
        error
    } = await client
        .storage
        .from(
            "asistencias-fotos"
        )
        .upload(

            nombreArchivo,

            blobFoto,

            {

                contentType:
                    "image/jpeg"

            }

        );


    if (
        error
    ) {

        console.warn(
            "No se pudo subir la foto:",
            error.message
        );

    }

}


// =====================================================
// DESCARGAR USUARIOS PARA MODO OFFLINE
// =====================================================

async function descargarUsuariosParaOffline() {

    if (
        !navigator.onLine ||
        !controlHorario ||
        !window.HorarioOffline
    ) {

        return;

    }


    try {

        const {
            data,
            error
        } = await window.supabaseClient.rpc(

            "listar_usuarios_control",

            {

                p_codigo:
                    controlHorario.codigo

            }

        );


        if (
            error
        ) {

            throw error;

        }


        const usuarios =
            Array.isArray(
                data
            )
                ? data
                : [];


        await window.HorarioOffline
            .guardarUsuariosOffline(

                controlHorario,

                usuarios

            );


        await window.HorarioOffline
            .guardarConfiguracionOffline(

                "horario_control",

                controlHorario

            );


        console.log(
            `${usuarios.length} usuario(s) preparados para trabajar sin internet.`
        );

    } catch (error) {

        console.warn(
            "No se pudieron actualizar los usuarios offline:",
            error
        );

    }

}


// =====================================================
// BUSCAR USUARIO
// ONLINE → SUPABASE
// OFFLINE → INDEXEDDB
// =====================================================

async function buscarUsuarioControl(
    identificador
) {

    if (
        navigator.onLine
    ) {

        try {

            const {
                data,
                error
            } = await window.supabaseClient.rpc(

                "buscar_usuario_control",

                {

                    p_codigo:
                        controlHorario.codigo,

                    p_identificador:
                        identificador

                }

            );


            if (
                !error
            ) {

                const usuario =
                    Array.isArray(
                        data
                    )
                        ? data[0]
                        : data;


                if (
                    usuario
                ) {

                    return usuario;

                }

            }

        } catch (error) {

            console.warn(
                "Supabase no respondió. Buscando usuario guardado en el dispositivo.",
                error
            );

        }

    }


    if (
        window.HorarioOffline &&
        controlHorario.organizacion_id
    ) {

        try {

            const usuarioLocal =
                await window.HorarioOffline
                    .buscarUsuarioOffline(

                        controlHorario.organizacion_id,

                        identificador

                    );


            if (
                usuarioLocal
            ) {

                return usuarioLocal;

            }

        } catch (error) {

            console.error(
                "No se pudo consultar IndexedDB:",
                error
            );

        }

    }


    return null;

}


// =====================================================
// OBTENER FOTO DEL USUARIO
// =====================================================

function obtenerFuenteFotoUsuario(
    usuario
) {

    if (
        usuario?.foto_blob
    ) {

        return URL.createObjectURL(
            usuario.foto_blob
        );

    }


    return usuario
        ?.foto_perfil_url ||
        null;

}


// =====================================================
// GUARDAR EVENTO Y SINCRONIZAR
// =====================================================

async function guardarYSincronizarEvento(
    evento
) {

    if (
        !window.HorarioOffline
    ) {

        throw new Error(
            "El almacenamiento offline no está disponible."
        );

    }


    /*
     * PRIMERO guardamos localmente.
     *
     * Esto es importante porque incluso si
     * internet desaparece justo durante el registro,
     * la asistencia no se pierde.
     */

    const eventoGuardado =
        await window.HorarioOffline
            .guardarEventoOffline(
                evento
            );


    if (
        !navigator.onLine
    ) {

        return {

            sincronizado:
                false,

            offline:
                true,

            evento:
                eventoGuardado

        };

    }


    try {

        const {
            data,
            error
        } = await window.supabaseClient.rpc(

            "sincronizar_evento_control",

            {

                p_codigo:
                    eventoGuardado.codigo,

                p_evento_id:
                    eventoGuardado.evento_id,

                p_alumno_id:
                    eventoGuardado.alumno_id,

                p_tipo:
                    eventoGuardado.tipo,

                p_fecha:
                    eventoGuardado.fecha,

                p_hora:
                    eventoGuardado.hora,

                p_latitud:
                    eventoGuardado.latitud,

                p_longitud:
                    eventoGuardado.longitud

            }

        );


        if (
            error
        ) {

            throw error;

        }


        await window.HorarioOffline
            .marcarEventoSincronizado(
                eventoGuardado.evento_id
            );


        return {

            sincronizado:
                true,

            offline:
                false,

            resultado:
                Array.isArray(
                    data
                )
                    ? data[0]
                    : data

        };


    } catch (error) {

        console.warn(
            "No se pudo enviar a Supabase. El registro quedó guardado en el dispositivo.",
            error
        );


        return {

            sincronizado:
                false,

            offline:
                true,

            evento:
                eventoGuardado

        };

    }

}


// =====================================================
// SINCRONIZAR PENDIENTES
// =====================================================

async function sincronizarEventosPendientes() {

    if (
        !navigator.onLine ||
        !window.HorarioOffline
    ) {

        await actualizarEstadoConexion();

        return;

    }


    let pendientes = [];


    try {

        pendientes =
            await window.HorarioOffline
                .obtenerEventosPendientes();

    } catch (error) {

        console.error(
            "No se pudieron obtener los eventos pendientes:",
            error
        );

        return;

    }


    if (
        pendientes.length === 0
    ) {

        await actualizarEstadoConexion();

        return;

    }


    console.log(
        `Sincronizando ${pendientes.length} registro(s) pendiente(s)...`
    );


    for (
        const evento
        of pendientes
    ) {

        try {

            const {
                error
            } = await window.supabaseClient.rpc(

                "sincronizar_evento_control",

                {

                    p_codigo:
                        evento.codigo,

                    p_evento_id:
                        evento.evento_id,

                    p_alumno_id:
                        evento.alumno_id,

                    p_tipo:
                        evento.tipo,

                    p_fecha:
                        evento.fecha,

                    p_hora:
                        evento.hora,

                    p_latitud:
                        evento.latitud,

                    p_longitud:
                        evento.longitud

                }

            );


            if (
                error
            ) {

                throw error;

            }


            await window.HorarioOffline
                .marcarEventoSincronizado(
                    evento.evento_id
                );


            console.log(
                "Registro sincronizado:",
                evento.evento_id
            );

        } catch (error) {

            console.error(
                "No se pudo sincronizar:",
                evento.evento_id,
                error
            );


            /*
             * Paramos aquí para conservar
             * el orden entrada → salida.
             */

            break;

        }

    }


    await actualizarEstadoConexion();

}


// =====================================================
// INDICADOR DE CONEXIÓN
// =====================================================

async function actualizarEstadoConexion() {

    const indicador =
        document.getElementById(
            "estado-conexion"
        );


    if (
        !indicador
    ) {

        return;

    }


    let pendientes =
        0;


    if (
        window.HorarioOffline
    ) {

        try {

            pendientes =
                await window.HorarioOffline
                    .contarEventosPendientes();

        } catch (_) {

            pendientes =
                0;

        }

    }


    if (
        navigator.onLine
    ) {

        indicador.className =
            "fixed top-4 left-4 z-40 bg-emerald-100 text-emerald-800 border border-emerald-300 px-4 py-2 rounded-xl text-xs font-bold shadow-lg";


        indicador.textContent =
            pendientes > 0
                ? `🔄 En línea · ${pendientes} pendiente(s)`
                : "🟢 En línea";

    } else {

        indicador.className =
            "fixed top-4 left-4 z-40 bg-amber-100 text-amber-800 border border-amber-300 px-4 py-2 rounded-xl text-xs font-bold shadow-lg";


        indicador.textContent =
            `🟠 Sin conexión · ${pendientes} pendiente(s)`;

    }

}


// =====================================================
// PROCESAR ENTRADA / SALIDA
// =====================================================

async function procesarRegistro() {

    const client =
        window.supabaseClient;


    const identificador =
        document
            .getElementById(
                "asistencia-matricula"
            )
            ?.value
            .trim();


    if (
        !identificador
    ) {

        mostrarStatusFeedback(
            false,
            "Ingresa tu identificador."
        );

        return;

    }


    const ahora =
        new Date();


    const hoy =
        ahora
            .toISOString()
            .split(
                "T"
            )[0];


    const horaActualStr =

        `${String(
            ahora.getHours()
        ).padStart(
            2,
            "0"
        )}:` +

        `${String(
            ahora.getMinutes()
        ).padStart(
            2,
            "0"
        )}:` +

        `${String(
            ahora.getSeconds()
        ).padStart(
            2,
            "0"
        )}`;


    let fotoTemporalUrl =
        null;


    try {

        // =============================================
        // BUSCAR USUARIO
        // =============================================

        const alumno =
            await buscarUsuarioControl(
                identificador
            );


        if (
            !alumno
        ) {

            throw new Error(

                `${
                    controlHorario
                        .nombre_identificador ||
                    "Identificador"
                } no encontrado.`

            );

        }


        // =============================================
        // OBTENER FOTO ONLINE U OFFLINE
        // =============================================

        const fotoOficial =
            obtenerFuenteFotoUsuario(
                alumno
            );


        if (
            !fotoOficial
        ) {

            throw new Error(
                "No tienes foto oficial registrada en este dispositivo."
            );

        }


        if (
            alumno.foto_blob
        ) {

            fotoTemporalUrl =
                fotoOficial;

        }


        // =============================================
        // VALIDAR ROSTRO Y GPS
        // =============================================

        const [
            coincideRostro,
            ubicacion
        ] =
            await Promise.all([

                validarRostroExpress(
                    fotoOficial
                ),

                obtenerUbicacionRapida()

            ]);


        if (
            !coincideRostro
        ) {

            throw new Error(
                "No eres la persona autorizada para este identificador."
            );

        }


        if (
            ubicacion &&
            !ubicacion.valido
        ) {

            throw new Error(

                `Fuera del rango de la oficina (${ubicacion.distanciaMetros}m).`

            );

        }


        // =============================================
        // TOMAR FOTO DEL REGISTRO
        // =============================================

        const blobFoto =
            await tomarFotografiaBlob();


        // =============================================
        // CREAR EVENTO
        // =============================================

        const evento = {

            codigo:
                controlHorario.codigo,

            organizacion_id:
                controlHorario.organizacion_id,

            alumno_id:
                alumno.id,

            identificador:
                identificador,

            nombre_completo:
                alumno.nombre_completo,

            tipo:
                tipoOperacion,

            fecha:
                hoy,

            hora:
                horaActualStr,

            latitud:
                ubicacion
                    ? ubicacion.latitud
                    : null,

            longitud:
                ubicacion
                    ? ubicacion.longitud
                    : null,

            creado_en:
                new Date()
                    .toISOString()

        };


        // =============================================
        // GUARDAR LOCAL / SINCRONIZAR
        // =============================================

        const resultadoRegistro =
            await guardarYSincronizarEvento(
                evento
            );


        // =============================================
        // REGISTRO OFFLINE
        // =============================================

        if (
            resultadoRegistro.offline
        ) {

            mostrarStatusFeedback(

                true,

                tipoOperacion ===
                "entrada"

                    ? `Entrada guardada sin conexión.\n${alumno.nombre_completo}\nSe sincronizará automáticamente.`

                    : `Salida guardada sin conexión.\n${alumno.nombre_completo}\nSe sincronizará automáticamente.`

            );

        }


        // =============================================
        // REGISTRO ONLINE
        // =============================================

        else {

            const resultado =
                resultadoRegistro.resultado;


            if (
                tipoOperacion ===
                "entrada"
            ) {

                mostrarStatusFeedback(

                    true,

                    `¡Entrada Registrada!\n${alumno.nombre_completo}`

                );

            }


            else if (
                tipoOperacion ===
                "salida"
            ) {

                const horas =
                    Number(
                        resultado
                            ?.horas_trabajadas ||
                        0
                    )
                    .toFixed(
                        2
                    );


                mostrarStatusFeedback(

                    true,

                    `¡Salida Registrada!\n+${horas} hrs`

                );

            }

        }


        // =============================================
        // FOTO DE ASISTENCIA
        // =============================================

        if (
            navigator.onLine
        ) {

            subirFotoAsistencia(

                client,

                alumno.id,

                tipoOperacion,

                blobFoto

            )
            .catch(
                (error) => {

                    console.warn(
                        "No se pudo subir la fotografía:",
                        error
                    );

                }
            );

        }


        // =============================================
        // LIMPIAR IDENTIFICADOR
        // =============================================

        const input =
            document.getElementById(
                "asistencia-matricula"
            );


        if (
            input
        ) {

            input.value =
                "";

        }


        await actualizarEstadoConexion();


        setTimeout(
            cerrarEscaner,
            3000
        );


    } catch (err) {

        console.error(
            err
        );


        mostrarStatusFeedback(

            false,

            err?.message ||
            "No se pudo registrar la asistencia."

        );


        setTimeout(
            cerrarEscaner,
            3000
        );


    } finally {

        /*
         * Cuando usamos una foto guardada como Blob,
         * liberamos la URL temporal.
         */

        if (
            fotoTemporalUrl
        ) {

            URL.revokeObjectURL(
                fotoTemporalUrl
            );

        }

    }

}


// =====================================================
// INICIO DE LA PÁGINA
// =====================================================

document.addEventListener(

    "DOMContentLoaded",

    async () => {

        controlHorario =
            leerContextoControl();


        if (
            !controlHorario ||
            !controlHorario.codigo
        ) {

            window.location.replace(
                "index.html"
            );

            return;

        }


        aplicarMarcaOrganizacion();


        iniciarRelojDigital();


        // =============================================
        // ESTADO DE CONEXIÓN
        // =============================================

        await actualizarEstadoConexion();


        // =============================================
        // MODELOS FACIALES
        // =============================================

        cargarModelosFaciales();


        // =============================================
        // PREPARAR DATOS OFFLINE
        // =============================================

        descargarUsuariosParaOffline()
            .then(
                () => {

                    actualizarEstadoConexion();

                }
            );


        // =============================================
        // SINCRONIZAR REGISTROS ANTIGUOS
        // =============================================

        sincronizarEventosPendientes();


        // =============================================
        // INTERNET REGRESA
        // =============================================

        window.addEventListener(

            "online",

            async () => {

                console.log(
                    "Internet disponible nuevamente."
                );


                await actualizarEstadoConexion();


                await descargarUsuariosParaOffline();


                await sincronizarEventosPendientes();

            }

        );


        // =============================================
        // INTERNET SE PIERDE
        // =============================================

        window.addEventListener(

            "offline",

            async () => {

                console.log(
                    "El dispositivo quedó sin conexión."
                );


                await actualizarEstadoConexion();

            }

        );


        // =============================================
        // BOTÓN ENTRADA
        // =============================================

        document
            .getElementById(
                "btn-iniciar-entrada"
            )
            ?.addEventListener(

                "click",

                () =>
                    abrirEscaner(
                        "entrada"
                    )

            );


        // =============================================
        // BOTÓN SALIDA
        // =============================================

        document
            .getElementById(
                "btn-iniciar-salida"
            )
            ?.addEventListener(

                "click",

                () =>
                    abrirEscaner(
                        "salida"
                    )

            );


        // =============================================
        // CANCELAR ESCÁNER
        // =============================================

        document
            .getElementById(
                "btn-cancelar-escaner"
            )
            ?.addEventListener(

                "click",

                cerrarEscaner

            );


        // =============================================
        // CERRAR CONTROL
        // =============================================

        document
            .getElementById(
                "btn-cerrar-control"
            )
            ?.addEventListener(

                "click",

                cerrarControlHorario

            );

    }

);


// =====================================================
// RECUPERAR CÁMARA
// =====================================================

document.addEventListener(

    "visibilitychange",

    () => {

        const modal =
            document.getElementById(
                "modal-escaner"
            );


        if (
            !document.hidden &&
            modal &&
            !modal.classList.contains(
                "hidden"
            )
        ) {

            asegurarCamaraActiva();

        }

    }

);