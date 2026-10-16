// js/auth.js

async function obtenerPerfilActual() {
    const client = window.supabaseClient;

    const {
        data: { session },
        error: sessionError
    } = await client.auth.getSession();

    if (sessionError || !session) {
        return {
            session: null,
            perfil: null
        };
    }

    const userId = session.user.id;

    const {
        data: perfil,
        error: perfilError
    } = await client
        .from("perfiles")
        .select(`
            id,
            usuario_id,
            nombre_completo,
            rol,
            organizacion_id,
            activo
        `)
        .or(`usuario_id.eq.${userId},id.eq.${userId}`)
        .maybeSingle();

    if (perfilError) {
        console.error(
            "Error al obtener perfil:",
            perfilError
        );
    }

    return {
        session,
        perfil
    };
}


async function protegerPagina(
    opciones = {}
) {
    const {
        soloAdmin = false
    } = opciones;

    const {
        session,
        perfil
    } = await obtenerPerfilActual();


    // Sin sesión
    if (!session) {

        window.location.replace(
            "index.html"
        );

        return null;
    }


    // Sin perfil
    if (!perfil) {

        await window.supabaseClient
            .auth
            .signOut();

        window.location.replace(
            "index.html"
        );

        return null;
    }


    // Usuario desactivado
    if (
        perfil.activo === false
    ) {

        await window.supabaseClient
            .auth
            .signOut();

        window.location.replace(
            "index.html"
        );

        return null;
    }


    // Solo administrador
    if (
        soloAdmin &&
        perfil.rol !== "admin"
    ) {

        await window.supabaseClient
            .auth
            .signOut();

        window.location.replace(
            "index.html"
        );

        return null;
    }


    window.usuarioActual = {

        id:
            session.user.id,

        email:
            session.user.email,

        nombre:
            perfil.nombre_completo,

        rol:
            perfil.rol,

        organizacion_id:
            perfil.organizacion_id

    };


    return window.usuarioActual;
}


async function cerrarSesion() {

    await window
        .supabaseClient
        .auth
        .signOut();


    window.location.replace(
        "index.html"
    );

}


async function agregarControlesSesion() {

    const usuario =
        window.usuarioActual;


    if (
        !usuario
    ) {

        return;

    }


    // Esperar a que exista el body
    if (
        !document.body
    ) {

        await new Promise(
            (resolve) => {

                document
                    .addEventListener(
                        "DOMContentLoaded",
                        resolve,
                        {
                            once: true
                        }
                    );

            }
        );

    }


    // Evitar duplicados
    if (
        document.getElementById(
            "controles-sesion-admin"
        )
    ) {

        return;

    }


    const contenedor =
        document.createElement(
            "div"
        );


    contenedor.id =
        "controles-sesion-admin";


   contenedor.className =
    "bg-white/95 backdrop-blur border border-slate-200 shadow-md rounded-xl px-3 py-2 flex items-center gap-3";

    const datos =
        document.createElement(
            "div"
        );


    const nombre =
        document.createElement(
            "div"
        );


    nombre.className =
        "text-xs font-bold text-slate-900";


    nombre.textContent =
        usuario.nombre ||
        usuario.email;


    const rol =
        document.createElement(
            "div"
        );


    rol.className =
        "text-[10px] uppercase tracking-wider text-slate-500";


    rol.textContent =
        usuario.rol;


    datos.appendChild(
        nombre
    );


    datos.appendChild(
        rol
    );


    const btn =
        document.createElement(
            "button"
        );


    btn.type =
        "button";


    btn.className =
        "bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl";


    btn.textContent =
        "Cerrar sesión";


    btn.addEventListener(
        "click",
        cerrarSesion
    );


    contenedor.appendChild(
        datos
    );


    contenedor.appendChild(
        btn
    );


   const slotSesion =
    document.getElementById(
        "sesion-admin-slot"
    );


if (slotSesion) {

    slotSesion.appendChild(
        contenedor
    );

} else {

    document.body.appendChild(
        contenedor
    );

}

}


window.obtenerPerfilActual =
    obtenerPerfilActual;


window.protegerPagina =
    protegerPagina;


window.cerrarSesion =
    cerrarSesion;


window.agregarControlesSesion =
    agregarControlesSesion;