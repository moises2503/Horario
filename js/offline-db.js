const OFFLINE_DB_NAME = "HorarioOfflineDB";
const OFFLINE_DB_VERSION = 3;


// =====================================================
// STORES
// =====================================================

const STORE_USUARIOS = "usuarios";

const STORE_EVENTOS = "eventos";

const STORE_CONFIG = "config";

const STORE_ADMIN_SESION = "admin_sesion";

const STORE_ADMIN_EVENTOS = "admin_eventos";

const STORE_ADMIN_DATOS = "admin_datos";


// =====================================================
// ABRIR BASE DE DATOS
// =====================================================

function abrirOfflineDB() {

    return new Promise(
        (resolve, reject) => {

            const request =
                indexedDB.open(
                    OFFLINE_DB_NAME,
                    OFFLINE_DB_VERSION
                );


            request.onupgradeneeded =
                (event) => {

                    const db =
                        event.target.result;


                    // =================================
                    // USUARIOS
                    // =================================

                    if (
                        !db.objectStoreNames.contains(
                            STORE_USUARIOS
                        )
                    ) {

                        const usuarios =
                            db.createObjectStore(
                                STORE_USUARIOS,
                                {
                                    keyPath:
                                        "clave"
                                }
                            );


                        usuarios.createIndex(
                            "organizacion_id",
                            "organizacion_id",
                            {
                                unique:
                                    false
                            }
                        );

                    }


                    // =================================
                    // EVENTOS DE ASISTENCIA
                    // =================================

                    if (
                        !db.objectStoreNames.contains(
                            STORE_EVENTOS
                        )
                    ) {

                        const eventos =
                            db.createObjectStore(
                                STORE_EVENTOS,
                                {
                                    keyPath:
                                        "evento_id"
                                }
                            );


                        eventos.createIndex(
                            "estado",
                            "estado",
                            {
                                unique:
                                    false
                            }
                        );


                        eventos.createIndex(
                            "creado_en",
                            "creado_en",
                            {
                                unique:
                                    false
                            }
                        );

                    }


                    // =================================
                    // CONFIGURACIÓN
                    // =================================

                    if (
                        !db.objectStoreNames.contains(
                            STORE_CONFIG
                        )
                    ) {

                        db.createObjectStore(
                            STORE_CONFIG,
                            {
                                keyPath:
                                    "clave"
                            }
                        );

                    }


                    // =================================
                    // SESIÓN OFFLINE ADMIN
                    // =================================

                    if (
                        !db.objectStoreNames.contains(
                            STORE_ADMIN_SESION
                        )
                    ) {

                        const sesionAdmin =
                            db.createObjectStore(
                                STORE_ADMIN_SESION,
                                {
                                    keyPath:
                                        "usuario_id"
                                }
                            );


                        sesionAdmin.createIndex(
                            "organizacion_id",
                            "organizacion_id",
                            {
                                unique:
                                    false
                            }
                        );


                        sesionAdmin.createIndex(
                            "email",
                            "email",
                            {
                                unique:
                                    false
                            }
                        );

                    }


                    // =================================
                    // EVENTOS OFFLINE ADMIN
                    // =================================

                    if (
                        !db.objectStoreNames.contains(
                            STORE_ADMIN_EVENTOS
                        )
                    ) {

                        const adminEventos =
                            db.createObjectStore(
                                STORE_ADMIN_EVENTOS,
                                {
                                    keyPath:
                                        "evento_id"
                                }
                            );


                        adminEventos.createIndex(
                            "estado",
                            "estado",
                            {
                                unique:
                                    false
                            }
                        );


                        adminEventos.createIndex(
                            "organizacion_id",
                            "organizacion_id",
                            {
                                unique:
                                    false
                            }
                        );


                        adminEventos.createIndex(
                            "tipo",
                            "tipo",
                            {
                                unique:
                                    false
                            }
                        );


                        adminEventos.createIndex(
                            "creado_en",
                            "creado_en",
                            {
                                unique:
                                    false
                            }
                        );

                    }


                    // =================================
                    // DATOS CACHÉ ADMIN
                    // =================================

                    if (
                        !db.objectStoreNames.contains(
                            STORE_ADMIN_DATOS
                        )
                    ) {

                        const adminDatos =
                            db.createObjectStore(
                                STORE_ADMIN_DATOS,
                                {
                                    keyPath:
                                        "clave"
                                }
                            );


                        adminDatos.createIndex(
                            "organizacion_id",
                            "organizacion_id",
                            {
                                unique:
                                    false
                            }
                        );

                    }

                };


            request.onsuccess =
                () => {

                    resolve(
                        request.result
                    );

                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );

                };

        }
    );

}


// =====================================================
// CONFIGURACIÓN GENERAL
// =====================================================

async function guardarConfiguracionOffline(
    clave,
    valor
) {

    const db =
        await abrirOfflineDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_CONFIG,
                    "readwrite"
                );


            tx.objectStore(
                STORE_CONFIG
            )
            .put({
                clave,
                valor
            });


            tx.oncomplete =
                () => resolve();


            tx.onerror =
                () => reject(
                    tx.error
                );

        }
    );

}


async function obtenerConfiguracionOffline(
    clave
) {

    const db =
        await abrirOfflineDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_CONFIG,
                    "readonly"
                );


            const req =
                tx.objectStore(
                    STORE_CONFIG
                )
                .get(
                    clave
                );


            req.onsuccess =
                () => {

                    resolve(
                        req.result
                            ?.valor ??
                        null
                    );

                };


            req.onerror =
                () => reject(
                    req.error
                );

        }
    );

}


// =====================================================
// DESCARGAR FOTO COMO BLOB
// =====================================================

async function descargarFotoComoBlob(
    url
) {

    if (!url) {
        return null;
    }


    try {

        const response =
            await fetch(
                url,
                {
                    cache:
                        "no-store"
                }
            );


        if (
            !response.ok
        ) {

            return null;

        }


        return await response.blob();


    } catch (error) {

        console.warn(
            "No se pudo guardar una foto para modo offline:",
            url,
            error
        );


        return null;

    }

}


// =====================================================
// USUARIOS OFFLINE DEL CONTROL
// =====================================================

async function guardarUsuariosOffline(
    organizacion,
    usuarios
) {

    const usuariosPreparados =
        [];


    for (
        const usuario
        of usuarios
    ) {

        const fotoBlob =
            await descargarFotoComoBlob(
                usuario.foto_perfil_url
            );


        usuariosPreparados.push({

            clave:
                `${organizacion.organizacion_id}:${usuario.identificador}`,

            organizacion_id:
                organizacion.organizacion_id,

            codigo:
                organizacion.codigo,

            id:
                usuario.id,

            identificador:
                usuario.identificador,

            nombre_completo:
                usuario.nombre_completo,

            foto_perfil_url:
                usuario.foto_perfil_url,

            foto_blob:
                fotoBlob,

            actualizado_en:
                new Date()
                    .toISOString()

        });

    }


    const db =
        await abrirOfflineDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_USUARIOS,
                    "readwrite"
                );


            const store =
                tx.objectStore(
                    STORE_USUARIOS
                );


            usuariosPreparados
                .forEach(
                    (usuario) => {

                        store.put(
                            usuario
                        );

                    }
                );


            tx.oncomplete =
                () => resolve();


            tx.onerror =
                () => reject(
                    tx.error
                );

        }
    );

}


// =====================================================
// BUSCAR USUARIO OFFLINE
// =====================================================

async function buscarUsuarioOffline(
    organizacionId,
    identificador
) {

    const db =
        await abrirOfflineDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_USUARIOS,
                    "readonly"
                );


            const clave =
                `${organizacionId}:${identificador}`;


            const req =
                tx.objectStore(
                    STORE_USUARIOS
                )
                .get(
                    clave
                );


            req.onsuccess =
                () => {

                    resolve(
                        req.result ||
                        null
                    );

                };


            req.onerror =
                () => reject(
                    req.error
                );

        }
    );

}


// =====================================================
// LISTAR USUARIOS OFFLINE
// =====================================================

async function listarUsuariosOffline(
    organizacionId
) {

    const db =
        await abrirOfflineDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_USUARIOS,
                    "readonly"
                );


            const req =
                tx.objectStore(
                    STORE_USUARIOS
                )
                .getAll();


            req.onsuccess =
                () => {

                    resolve(
                        (
                            req.result ||
                            []
                        )
                        .filter(
                            (usuario) =>
                                usuario.organizacion_id ===
                                organizacionId
                        )
                    );

                };


            req.onerror =
                () => reject(
                    req.error
                );

        }
    );

}


// =====================================================
// ID ÚNICO
// =====================================================

function crearEventoId() {

    if (
        crypto.randomUUID
    ) {

        return crypto.randomUUID();

    }


    return (

        Date.now()
            .toString(
                16
            ) +

        "-" +

        Math.random()
            .toString(
                16
            )
            .slice(
                2
            )

    );

}


// =====================================================
// EVENTOS OFFLINE CONTROL DE HORARIO
// =====================================================

async function guardarEventoOffline(
    evento
) {

    const db =
        await abrirOfflineDB();


    const eventoCompleto = {

        ...evento,

        evento_id:
            evento.evento_id ||
            crearEventoId(),

        estado:
            evento.estado ||
            "pendiente",

        creado_en:
            evento.creado_en ||
            new Date()
                .toISOString()

    };


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_EVENTOS,
                    "readwrite"
                );


            tx.objectStore(
                STORE_EVENTOS
            )
            .put(
                eventoCompleto
            );


            tx.oncomplete =
                () => {

                    resolve(
                        eventoCompleto
                    );

                };


            tx.onerror =
                () => reject(
                    tx.error
                );

        }
    );

}


// =====================================================
// OBTENER EVENTOS PENDIENTES DEL CONTROL
// =====================================================

async function obtenerEventosPendientes() {

    const db =
        await abrirOfflineDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_EVENTOS,
                    "readonly"
                );


            const req =
                tx.objectStore(
                    STORE_EVENTOS
                )
                .getAll();


            req.onsuccess =
                () => {

                    const pendientes =
                        (
                            req.result ||
                            []
                        )
                        .filter(
                            (evento) =>
                                evento.estado ===
                                "pendiente"
                        )
                        .sort(
                            (a, b) =>
                                new Date(
                                    a.creado_en
                                ) -
                                new Date(
                                    b.creado_en
                                )
                        );


                    resolve(
                        pendientes
                    );

                };


            req.onerror =
                () => reject(
                    req.error
                );

        }
    );

}


// =====================================================
// MARCAR EVENTO CONTROL COMO SINCRONIZADO
// =====================================================

async function marcarEventoSincronizado(
    eventoId
) {

    const db =
        await abrirOfflineDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_EVENTOS,
                    "readwrite"
                );


            const store =
                tx.objectStore(
                    STORE_EVENTOS
                );


            const req =
                store.get(
                    eventoId
                );


            req.onsuccess =
                () => {

                    if (
                        !req.result
                    ) {

                        return;

                    }


                    store.put({

                        ...req.result,

                        estado:
                            "sincronizado",

                        sincronizado_en:
                            new Date()
                                .toISOString()

                    });

                };


            tx.oncomplete =
                () => resolve();


            tx.onerror =
                () => reject(
                    tx.error
                );

        }
    );

}


// =====================================================
// CONTAR PENDIENTES DEL CONTROL
// =====================================================

async function contarEventosPendientes() {

    const eventos =
        await obtenerEventosPendientes();


    return eventos.length;

}


// =====================================================
// SESIÓN OFFLINE ADMIN
// =====================================================

async function guardarSesionAdminOffline(
    sesion
) {

    if (
        !sesion ||
        !sesion.usuario_id
    ) {

        throw new Error(
            "La sesión administrativa no contiene usuario_id."
        );

    }


    const db =
        await abrirOfflineDB();


    const sesionCompleta = {

        ...sesion,

        guardado_en:
            new Date()
                .toISOString(),

        ultima_validacion_online:
            new Date()
                .toISOString()

    };


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_ADMIN_SESION,
                    "readwrite"
                );


            tx.objectStore(
                STORE_ADMIN_SESION
            )
            .put(
                sesionCompleta
            );


            tx.oncomplete =
                () => {

                    resolve(
                        sesionCompleta
                    );

                };


            tx.onerror =
                () => reject(
                    tx.error
                );

        }
    );

}


// =====================================================
// OBTENER SESIÓN ADMIN POR EMAIL
// =====================================================

async function obtenerSesionAdminOfflinePorEmail(
    email
) {

    if (!email) {
        return null;
    }


    const db =
        await abrirOfflineDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_ADMIN_SESION,
                    "readonly"
                );


            const store =
                tx.objectStore(
                    STORE_ADMIN_SESION
                );


            const index =
                store.index(
                    "email"
                );


            const req =
                index.get(
                    email
                );


            req.onsuccess =
                () => {

                    resolve(
                        req.result ||
                        null
                    );

                };


            req.onerror =
                () => reject(
                    req.error
                );

        }
    );

}


// =====================================================
// OBTENER CUALQUIER SESIÓN ADMIN LOCAL
// =====================================================

async function obtenerSesionAdminOffline() {

    const db =
        await abrirOfflineDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_ADMIN_SESION,
                    "readonly"
                );


            const req =
                tx.objectStore(
                    STORE_ADMIN_SESION
                )
                .getAll();


            req.onsuccess =
                () => {

                    const sesiones =
                        req.result ||
                        [];


                    if (
                        sesiones.length ===
                        0
                    ) {

                        resolve(
                            null
                        );

                        return;

                    }


                    sesiones.sort(
                        (a, b) =>
                            new Date(
                                b.ultima_validacion_online ||
                                b.guardado_en ||
                                0
                            ) -
                            new Date(
                                a.ultima_validacion_online ||
                                a.guardado_en ||
                                0
                            )
                    );


                    resolve(
                        sesiones[0]
                    );

                };


            req.onerror =
                () => reject(
                    req.error
                );

        }
    );

}


// =====================================================
// ELIMINAR SESIÓN ADMIN LOCAL
// =====================================================

async function eliminarSesionAdminOffline(
    usuarioId
) {

    if (!usuarioId) {
        return;
    }


    const db =
        await abrirOfflineDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_ADMIN_SESION,
                    "readwrite"
                );


            tx.objectStore(
                STORE_ADMIN_SESION
            )
            .delete(
                usuarioId
            );


            tx.oncomplete =
                () => resolve();


            tx.onerror =
                () => reject(
                    tx.error
                );

        }
    );

}


// =====================================================
// GUARDAR EVENTO ADMIN OFFLINE
// =====================================================

async function guardarEventoAdminOffline(
    evento
) {

    if (
        !evento ||
        !evento.tipo
    ) {

        throw new Error(
            "El evento administrativo no tiene tipo."
        );

    }


    const db =
        await abrirOfflineDB();


    const eventoCompleto = {

        ...evento,

        evento_id:
            evento.evento_id ||
            crearEventoId(),

        estado:
            evento.estado ||
            "pendiente",

        creado_en:
            evento.creado_en ||
            new Date()
                .toISOString(),

        intentos:
            evento.intentos ||
            0

    };


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_ADMIN_EVENTOS,
                    "readwrite"
                );


            tx.objectStore(
                STORE_ADMIN_EVENTOS
            )
            .put(
                eventoCompleto
            );


            tx.oncomplete =
                () => {

                    resolve(
                        eventoCompleto
                    );

                };


            tx.onerror =
                () => reject(
                    tx.error
                );

        }
    );

}


// =====================================================
// EVENTOS ADMIN PENDIENTES
// =====================================================

async function obtenerEventosAdminPendientes(
    organizacionId = null
) {

    const db =
        await abrirOfflineDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_ADMIN_EVENTOS,
                    "readonly"
                );


            const req =
                tx.objectStore(
                    STORE_ADMIN_EVENTOS
                )
                .getAll();


            req.onsuccess =
                () => {

                    let eventos =
                        req.result ||
                        [];


                    eventos =
                        eventos
                            .filter(
                                (evento) =>
                                    evento.estado ===
                                    "pendiente"
                            );


                    if (
                        organizacionId
                    ) {

                        eventos =
                            eventos.filter(
                                (evento) =>
                                    evento.organizacion_id ===
                                    organizacionId
                            );

                    }


                    eventos.sort(
                        (a, b) =>
                            new Date(
                                a.creado_en
                            ) -
                            new Date(
                                b.creado_en
                            )
                    );


                    resolve(
                        eventos
                    );

                };


            req.onerror =
                () => reject(
                    req.error
                );

        }
    );

}


// =====================================================
// MARCAR EVENTO ADMIN SINCRONIZADO
// =====================================================

async function marcarEventoAdminSincronizado(
    eventoId
) {

    const db =
        await abrirOfflineDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_ADMIN_EVENTOS,
                    "readwrite"
                );


            const store =
                tx.objectStore(
                    STORE_ADMIN_EVENTOS
                );


            const req =
                store.get(
                    eventoId
                );


            req.onsuccess =
                () => {

                    if (
                        !req.result
                    ) {

                        return;

                    }


                    store.put({

                        ...req.result,

                        estado:
                            "sincronizado",

                        sincronizado_en:
                            new Date()
                                .toISOString()

                    });

                };


            tx.oncomplete =
                () => resolve();


            tx.onerror =
                () => reject(
                    tx.error
                );

        }
    );

}


// =====================================================
// MARCAR ERROR EN EVENTO ADMIN
// =====================================================

async function marcarErrorEventoAdmin(
    eventoId,
    mensaje
) {

    const db =
        await abrirOfflineDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_ADMIN_EVENTOS,
                    "readwrite"
                );


            const store =
                tx.objectStore(
                    STORE_ADMIN_EVENTOS
                );


            const req =
                store.get(
                    eventoId
                );


            req.onsuccess =
                () => {

                    if (
                        !req.result
                    ) {

                        return;

                    }


                    store.put({

                        ...req.result,

                        intentos:
                            (
                                req.result
                                    .intentos ||
                                0
                            ) +
                            1,

                        ultimo_error:
                            mensaje ||
                            "Error desconocido",

                        ultimo_intento_en:
                            new Date()
                                .toISOString()

                    });

                };


            tx.oncomplete =
                () => resolve();


            tx.onerror =
                () => reject(
                    tx.error
                );

        }
    );

}


// =====================================================
// CONTAR EVENTOS ADMIN PENDIENTES
// =====================================================

async function contarEventosAdminPendientes(
    organizacionId = null
) {

    const eventos =
        await obtenerEventosAdminPendientes(
            organizacionId
        );


    return eventos.length;

}


// =====================================================
// GUARDAR DATOS ADMIN EN CACHÉ
// =====================================================

async function guardarDatosAdminOffline(
    clave,
    organizacionId,
    valor
) {

    const db =
        await abrirOfflineDB();


    const registro = {

        clave,

        organizacion_id:
            organizacionId,

        valor,

        actualizado_en:
            new Date()
                .toISOString()

    };


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_ADMIN_DATOS,
                    "readwrite"
                );


            tx.objectStore(
                STORE_ADMIN_DATOS
            )
            .put(
                registro
            );


            tx.oncomplete =
                () => {

                    resolve(
                        registro
                    );

                };


            tx.onerror =
                () => reject(
                    tx.error
                );

        }
    );

}


// =====================================================
// OBTENER DATOS ADMIN EN CACHÉ
// =====================================================

async function obtenerDatosAdminOffline(
    clave
) {

    const db =
        await abrirOfflineDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_ADMIN_DATOS,
                    "readonly"
                );


            const req =
                tx.objectStore(
                    STORE_ADMIN_DATOS
                )
                .get(
                    clave
                );


            req.onsuccess =
                () => {

                    resolve(
                        req.result
                            ?.valor ??
                        null
                    );

                };


            req.onerror =
                () => reject(
                    req.error
                );

        }
    );

}


// =====================================================
// LISTAR DATOS ADMIN DE UNA ORGANIZACIÓN
// =====================================================

async function listarDatosAdminOffline(
    organizacionId
) {

    const db =
        await abrirOfflineDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE_ADMIN_DATOS,
                    "readonly"
                );


            const req =
                tx.objectStore(
                    STORE_ADMIN_DATOS
                )
                .getAll();


            req.onsuccess =
                () => {

                    resolve(
                        (
                            req.result ||
                            []
                        )
                        .filter(
                            (item) =>
                                item.organizacion_id ===
                                organizacionId
                        )
                    );

                };


            req.onerror =
                () => reject(
                    req.error
                );

        }
    );

}


// =====================================================
// API GLOBAL
// =====================================================

window.HorarioOffline = {

    abrirOfflineDB,


    // Configuración
    guardarConfiguracionOffline,

    obtenerConfiguracionOffline,


    // Usuarios control
    guardarUsuariosOffline,

    buscarUsuarioOffline,

    listarUsuariosOffline,


    // Eventos control
    guardarEventoOffline,

    obtenerEventosPendientes,

    marcarEventoSincronizado,

    contarEventosPendientes,


    // Admin sesión
    guardarSesionAdminOffline,

    obtenerSesionAdminOfflinePorEmail,

    obtenerSesionAdminOffline,

    eliminarSesionAdminOffline,


    // Admin eventos
    guardarEventoAdminOffline,

    obtenerEventosAdminPendientes,

    marcarEventoAdminSincronizado,

    marcarErrorEventoAdmin,

    contarEventosAdminPendientes,


    // Admin datos
    guardarDatosAdminOffline,

    obtenerDatosAdminOffline,

    listarDatosAdminOffline,


    // Utilidades
    crearEventoId

};