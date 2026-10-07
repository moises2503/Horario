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

    const { data: perfil, error: perfilError } = await client
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
        console.error("Error al obtener perfil:", perfilError);
    }

    return {
        session,
        perfil
    };
}

async function protegerPagina(opciones = {}) {
    const {
        soloAdmin = false
    } = opciones;

    const { session, perfil } = await obtenerPerfilActual();

    if (!session) {
        window.location.replace("login.html");
        return null;
    }

    if (!perfil) {
        await window.supabaseClient.auth.signOut();
        window.location.replace("login.html");
        return null;
    }

    if (perfil.activo === false) {
        await window.supabaseClient.auth.signOut();
        window.location.replace("login.html");
        return null;
    }

    if (soloAdmin && perfil.rol !== "admin") {
        window.location.replace("index.html");
        return null;
    }

    window.usuarioActual = {
        id: session.user.id,
        email: session.user.email,
        nombre: perfil.nombre_completo,
        rol: perfil.rol,
        organizacion_id: perfil.organizacion_id
    };

    return window.usuarioActual;
}

async function cerrarSesion() {
    const client = window.supabaseClient;

    await client.auth.signOut();

    window.location.replace("login.html");
}

async function agregarControlesSesion() {
    const usuario = window.usuarioActual;

    if (!usuario) return;

    const contenedor = document.createElement("div");

    contenedor.className =
        "fixed bottom-4 right-4 z-50 bg-white/95 backdrop-blur border border-slate-200 shadow-xl rounded-2xl px-4 py-3 flex items-center gap-3";

    const nombre = document.createElement("div");

    nombre.innerHTML = `
        <div class="text-xs font-bold text-slate-900">
            ${usuario.nombre || usuario.email}
        </div>
        <div class="text-[10px] uppercase tracking-wider text-slate-500">
            ${usuario.rol}
        </div>
    `;

    const btn = document.createElement("button");

    btn.type = "button";

    btn.className =
        "bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl";

    btn.textContent = "Cerrar sesión";

    btn.addEventListener("click", cerrarSesion);

    contenedor.appendChild(nombre);
    contenedor.appendChild(btn);

    document.body.appendChild(contenedor);
}

window.obtenerPerfilActual = obtenerPerfilActual;
window.protegerPagina = protegerPagina;
window.cerrarSesion = cerrarSesion;
window.agregarControlesSesion = agregarControlesSesion;