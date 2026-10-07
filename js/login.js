document.addEventListener("DOMContentLoaded", async () => {
    const supabase = window.supabaseClient;

    const panelLogin = document.getElementById("panel-login");
    const panelRegistro = document.getElementById("panel-registro");
    const mensaje = document.getElementById("auth-message");

    const btnMostrarRegistro = document.getElementById("btn-mostrar-registro");
    const btnVolverLogin = document.getElementById("btn-volver-login");

    const formLogin = document.getElementById("form-login");
    const formRegistro = document.getElementById("form-registro-organizacion");

    function mostrarMensaje(texto, tipo = "error") {
        mensaje.classList.remove(
            "hidden",
            "bg-red-100",
            "text-red-700",
            "bg-emerald-100",
            "text-emerald-700"
        );

        if (tipo === "success") {
            mensaje.classList.add("bg-emerald-100", "text-emerald-700");
        } else {
            mensaje.classList.add("bg-red-100", "text-red-700");
        }

        mensaje.textContent = texto;
    }

    btnMostrarRegistro.addEventListener("click", () => {
        panelLogin.classList.add("hidden");
        panelRegistro.classList.remove("hidden");
        mensaje.classList.add("hidden");
    });

    btnVolverLogin.addEventListener("click", () => {
        panelRegistro.classList.add("hidden");
        panelLogin.classList.remove("hidden");
        mensaje.classList.add("hidden");
    });

    formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            mostrarMensaje("No se pudo iniciar sesión: " + error.message);
            return;
        }

        const user = data.user;

        const { data: perfil, error: perfilError } = await supabase
            .from("perfiles")
            .select("rol, organizacion_id, nombre_completo")
            .or(`usuario_id.eq.${user.id},id.eq.${user.id}`)
            .maybeSingle();

        if (perfilError || !perfil) {
            mostrarMensaje("La cuenta existe, pero no tiene un perfil asociado.");
            return;
        }

        if (perfil.rol === "admin") {
            window.location.href = "admin.html";
        } else {
            window.location.href = "index.html";
        }
    });

    formRegistro.addEventListener("submit", async (e) => {
        e.preventDefault();

        const organizacionNombre = document
            .getElementById("reg-organizacion")
            .value
            .trim();

        const organizacionTipo = document.getElementById("reg-tipo").value;

        const nombreAdmin = document
            .getElementById("reg-admin-nombre")
            .value
            .trim();

        const email = document.getElementById("reg-email").value.trim();

        const password = document.getElementById("reg-password").value;

        const confirmPassword = document.getElementById(
            "reg-confirm-password"
        ).value;

        const btnRegistro = document.getElementById("btn-registro");

        if (password !== confirmPassword) {
            mostrarMensaje("Las contraseñas no coinciden.");
            return;
        }

        btnRegistro.disabled = true;
        btnRegistro.textContent = "Registrando...";

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        registration_type: "organization_admin",
                        organizacion_nombre: organizacionNombre,
                        organizacion_tipo: organizacionTipo,
                        nombre_completo: nombreAdmin
                    }
                }
            });

            if (error) {
                if (
                    error.status === 429 ||
                    error.message.toLowerCase().includes("rate limit")
                ) {
                    mostrarMensaje(
                        "Supabase alcanzó temporalmente el límite de correos de registro. Espera unos minutos o desactiva temporalmente la confirmación por correo."
                    );
                } else {
                    mostrarMensaje(
                        "No se pudo registrar la organización: " +
                        error.message
                    );
                }

                return;
            }

            mostrarMensaje(
                "Organización registrada correctamente.",
                "success"
            );

            formRegistro.reset();

        } finally {
            btnRegistro.disabled = false;
            btnRegistro.textContent = "Registrar organización";
        }
    });

    const {
        data: { session }
    } = await supabase.auth.getSession();

    if (session) {
        const { data: perfil } = await supabase
            .from("perfiles")
            .select("rol")
            .or(`usuario_id.eq.${session.user.id},id.eq.${session.user.id}`)
            .maybeSingle();

        if (perfil?.rol === "admin") {
            window.location.href = "admin.html";
        } else if (perfil) {
            window.location.href = "index.html";
        }
    }
});