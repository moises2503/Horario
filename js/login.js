document.addEventListener("DOMContentLoaded", () => {
    const supabase = window.supabaseClient;

    const mensaje = document.getElementById("auth-message");

    const paneles = [
        "panel-selector",
        "panel-login",
        "panel-control",
        "panel-registro"
    ];

    function mostrarPanel(id) {
        paneles.forEach((panelId) => {
            const panel = document.getElementById(panelId);

            if (!panel) return;

            if (panelId === id) {
                panel.classList.remove("hidden");
            } else {
                panel.classList.add("hidden");
            }
        });

        if (mensaje) {
            mensaje.classList.add("hidden");
        }
    }

    function mostrarMensaje(texto, tipo = "error") {
        if (!mensaje) return;

        mensaje.className = "rounded-xl p-3 text-sm";

        if (tipo === "success") {
            mensaje.classList.add(
                "bg-emerald-100",
                "text-emerald-700"
            );
        } else {
            mensaje.classList.add(
                "bg-red-100",
                "text-red-700"
            );
        }

        mensaje.textContent = texto;
    }


    // ========================================
    // BOTÓN ADMINISTRADOR
    // ========================================

    document
        .getElementById("btn-ir-admin")
        ?.addEventListener("click", () => {

            mostrarPanel("panel-login");

        });


    // ========================================
    // BOTÓN CONTROL DE HORARIO
    // ========================================

    document
        .getElementById("btn-ir-control")
        ?.addEventListener("click", () => {

            mostrarPanel("panel-control");

        });


    // ========================================
    // BOTONES VOLVER
    // ========================================

    document
        .querySelectorAll("[data-volver]")
        .forEach((btn) => {

            btn.addEventListener("click", () => {

                mostrarPanel("panel-selector");

            });

        });


    // ========================================
    // MOSTRAR REGISTRO ORGANIZACIÓN
    // ========================================

    document
        .getElementById("btn-mostrar-registro")
        ?.addEventListener("click", () => {

            mostrarPanel("panel-registro");

        });


    document
        .getElementById("btn-volver-login")
        ?.addEventListener("click", () => {

            mostrarPanel("panel-login");

        });


    // ========================================
    // LOGIN ADMINISTRADOR
    // ========================================

    document
        .getElementById("form-login")
        ?.addEventListener("submit", async (e) => {

            e.preventDefault();

            const email =
                document
                    .getElementById("login-email")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("login-password")
                    .value;

            const btn =
                document.getElementById("btn-login");

            btn.disabled = true;
            btn.textContent = "Ingresando...";

            try {

                const { data, error } =
                    await supabase.auth.signInWithPassword({
                        email,
                        password
                    });


                if (error) {

                    mostrarMensaje(
                        "No se pudo iniciar sesión: " +
                        error.message
                    );

                    return;
                }


                const userId = data.user.id;


                const {
                    data: perfil,
                    error: perfilError
                } = await supabase
                    .from("perfiles")
                    .select(`
                        rol,
                        organizacion_id,
                        nombre_completo,
                        activo
                    `)
                    .or(
                        `usuario_id.eq.${userId},id.eq.${userId}`
                    )
                    .maybeSingle();


                if (perfilError || !perfil) {

                    await supabase.auth.signOut();

                    mostrarMensaje(
                        "La cuenta existe, pero no tiene un perfil asociado."
                    );

                    return;
                }


                if (perfil.activo === false) {

                    await supabase.auth.signOut();

                    mostrarMensaje(
                        "Esta cuenta está desactivada."
                    );

                    return;
                }


                if (perfil.rol !== "admin") {

                    await supabase.auth.signOut();

                    mostrarMensaje(
                        "Esta cuenta no tiene permisos de administrador."
                    );

                    return;
                }


                window.location.href = "admin.html";

            } catch (err) {

                console.error(err);

                mostrarMensaje(
                    "Ocurrió un error al iniciar sesión."
                );

            } finally {

                btn.disabled = false;
                btn.textContent = "Iniciar sesión";

            }

        });


    // ========================================
    // REGISTRO DE ORGANIZACIÓN
    // ========================================

    document
        .getElementById("form-registro-organizacion")
        ?.addEventListener("submit", async (e) => {

            e.preventDefault();


            const organizacionNombre =
                document
                    .getElementById("reg-organizacion")
                    .value
                    .trim();


            const organizacionTipo =
                document
                    .getElementById("reg-tipo")
                    .value;


            const nombreAdmin =
                document
                    .getElementById("reg-admin-nombre")
                    .value
                    .trim();


            const email =
                document
                    .getElementById("reg-email")
                    .value
                    .trim();


            const password =
                document
                    .getElementById("reg-password")
                    .value;


            const confirmPassword =
                document
                    .getElementById("reg-confirm-password")
                    .value;


            const btn =
                document.getElementById("btn-registro");


            if (password !== confirmPassword) {

                mostrarMensaje(
                    "Las contraseñas no coinciden."
                );

                return;
            }


            btn.disabled = true;
            btn.textContent = "Registrando...";


            try {

                const { data, error } =
                    await supabase.auth.signUp({

                        email,

                        password,

                        options: {

                            data: {

                                registration_type:
                                    "organization_admin",

                                organizacion_nombre:
                                    organizacionNombre,

                                organizacion_tipo:
                                    organizacionTipo,

                                nombre_completo:
                                    nombreAdmin

                            }

                        }

                    });


                if (error) {

                    mostrarMensaje(
                        "No se pudo registrar la organización: " +
                        error.message
                    );

                    return;
                }


                // Si Supabase entrega sesión inmediatamente,
                // entramos directo al panel administrador.

                if (data.session) {

                    window.location.href =
                        "admin.html";

                    return;
                }


                document
                    .getElementById(
                        "form-registro-organizacion"
                    )
                    .reset();


                mostrarPanel("panel-login");


                mostrarMensaje(
                    "Organización registrada correctamente. Ya puedes iniciar sesión.",
                    "success"
                );


            } catch (err) {

                console.error(err);

                mostrarMensaje(
                    "Ocurrió un error al registrar la organización."
                );

            } finally {

                btn.disabled = false;

                btn.textContent =
                    "Registrar organización";

            }

        });


    // ========================================
    // CONTROL DE HORARIO POR CÓDIGO
    // ========================================

    document
        .getElementById("form-control")
        ?.addEventListener("submit", async (e) => {

            e.preventDefault();


            const codigoInput =
                document.getElementById(
                    "control-codigo"
                );


            const btn =
                document.getElementById(
                    "btn-control"
                );


            const codigo =
                codigoInput
                    .value
                    .trim()
                    .toUpperCase();


            if (!codigo) {

                mostrarMensaje(
                    "Ingresa el código de tu organización."
                );

                return;
            }


            btn.disabled = true;

            btn.textContent =
                "Validando código...";


            try {

                const {
                    data,
                    error
                } = await supabase.rpc(
                    "validar_codigo_organizacion",
                    {
                        p_codigo: codigo
                    }
                );


                if (error) {

                    console.error(error);

                    mostrarMensaje(
                        "No se pudo validar el código."
                    );

                    return;
                }


                const organizacion =
                    Array.isArray(data)
                        ? data[0]
                        : data;


                if (!organizacion) {

                    mostrarMensaje(
                        "El código de organización no es válido."
                    );

                    return;
                }


                // Guardamos temporalmente la organización
                // seleccionada en esta pestaña.

                sessionStorage.setItem(
                    "horario_control",
                    JSON.stringify({

                        codigo:

                            codigo,


                        organizacion_id:

                            organizacion.organizacion_id,


                        nombre:

                            organizacion.nombre,


                        tipo:

                            organizacion.tipo,


                        color_principal:

                            organizacion.color_principal ||
                            "#00A3E0",


                        logo_url:

                            organizacion.logo_url ||
                            null,


                        nombre_identificador:

                            organizacion.nombre_identificador ||
                            "Matrícula"

                    })
                );


                // Entrar solamente al control de horario

                window.location.href =
                    "horario.html";


            } catch (err) {

                console.error(err);

                mostrarMensaje(
                    "Ocurrió un error al validar el código."
                );

            } finally {

                btn.disabled = false;

                btn.textContent =
                    "Ingresar al horario";

            }

        });

});