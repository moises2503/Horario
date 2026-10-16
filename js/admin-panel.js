function mostrarErrorOrganizacion(error) {
    console.error("No se pudo cargar la organización:", error);

    const nombre =
        document.getElementById("organizacion-nombre");
    const codigo =
        document.getElementById("organizacion-codigo");
    const copiar =
        document.getElementById("btn-copiar-codigo");

    if (nombre) {
        nombre.textContent = "No se pudo cargar";
    }

    if (codigo) {
        codigo.textContent = "No disponible";
    }

    if (copiar) {
        copiar.disabled = true;
        copiar.title = "No hay un código disponible para copiar.";
    }
}

async function cargarOrganizacionPanel() {
    try {
        const { session, perfil } =
            await window.obtenerPerfilActual();

        if (!session || !perfil) {
            throw new Error(
                "No se encontró una sesión o perfil de administrador."
            );
        }

        if (!perfil.organizacion_id) {
            throw new Error(
                "El perfil no tiene una organización asociada."
            );
        }

        const { data: organizacion, error } =
            await window.supabaseClient
                .from("organizaciones")
                .select("*")
                .eq("id", perfil.organizacion_id)
                .maybeSingle();

        if (error) {
            throw error;
        }

        if (!organizacion) {
            throw new Error(
                "No se encontró la organización del administrador."
            );
        }

        const codigoAcceso =
            organizacion.codigo ||
            organizacion.codigo_acceso;

        if (!codigoAcceso) {
            throw new Error(
                "La organización no tiene un código de acceso configurado."
            );
        }

        const nombre =
            document.getElementById("organizacion-nombre");
        const tipo =
            document.getElementById("organizacion-tipo");
        const color =
            document.getElementById("organizacion-color");
        const codigo =
            document.getElementById("organizacion-codigo");
        const identificador =
            document.getElementById("organizacion-identificador");
        const headerNombre =
            document.getElementById("header-organizacion-nombre");
        const logo =
            document.getElementById("organizacion-logo");
        const logoPlaceholder =
            document.getElementById("organizacion-logo-placeholder");

        const nombreOrganizacion =
            organizacion.nombre || "Mi organización";
        const colorPrincipal =
            organizacion.color_principal || "#00A3E0";

        if (nombre) {
            nombre.textContent = nombreOrganizacion;
        }

        if (headerNombre) {
            headerNombre.textContent = nombreOrganizacion;
        }

        if (tipo) {
            tipo.textContent = organizacion.tipo || "Organización";
        }

        if (color) {
            color.style.backgroundColor = colorPrincipal;
        }

        if (codigo) {
            codigo.textContent = codigoAcceso;
        }

        if (identificador) {
            identificador.textContent =
                organizacion.nombre_identificador || "Matrícula";
        }

        if (logo && logoPlaceholder && organizacion.logo_url) {
            logo.src = organizacion.logo_url;
            logo.classList.remove("hidden");
            logoPlaceholder.classList.add("hidden");
            logo.addEventListener(
                "error",
                () => {
                    logo.classList.add("hidden");
                    logoPlaceholder.classList.remove("hidden");
                },
                { once: true }
            );
        }

        const copiar =
            document.getElementById("btn-copiar-codigo");

        if (copiar) {
            copiar.disabled = false;
            copiar.addEventListener("click", async () => {
                try {
                    await window.navigator.clipboard.writeText(codigoAcceso);
                    copiar.textContent = "✅ Copiado";
                    window.setTimeout(() => {
                        copiar.textContent = "📋 Copiar";
                    }, 1800);
                } catch (error) {
                    console.error("No se pudo copiar el código:", error);
                    window.alert(
                        "No se pudo copiar automáticamente. Selecciona y copia el código manualmente."
                    );
                }
            });
        }
    } catch (error) {
        mostrarErrorOrganizacion(error);
    }
}

document.addEventListener(
    "DOMContentLoaded",
    cargarOrganizacionPanel,
    { once: true }
);

function formatearFechaAlumno(fecha) {
    if (!fecha) {
        return "N/A";
    }

    const partes = fecha.split("-");
    return partes.length === 3
        ? `${partes[2]}/${partes[1]}/${partes[0]}`
        : fecha;
}

function crearCeldaAlumno(texto, className = "p-3.5") {
    const celda = document.createElement("td");
    celda.className = className;
    celda.textContent = texto;
    return celda;
}

function mostrarMensajeTabla(mensaje) {
    const tabla = document.getElementById("tabla-alumnos");
    if (!tabla) {
        return;
    }

    tabla.replaceChildren();
    const fila = document.createElement("tr");
    const celda = crearCeldaAlumno(
        mensaje,
        "p-6 text-center text-sm font-semibold text-slate-500"
    );
    celda.colSpan = 7;
    fila.appendChild(celda);
    tabla.appendChild(fila);
}

function renderizarAlumnos(alumnos) {
    const tabla = document.getElementById("tabla-alumnos");
    if (!tabla) {
        return;
    }

    window.alumnosPanelPorId = new Map(
        alumnos.map((alumno) => [String(alumno.id), alumno])
    );
    tabla.replaceChildren();

    if (alumnos.length === 0) {
        mostrarMensajeTabla("Todavía no hay alumnos registrados.");
        return;
    }

    for (const alumno of alumnos) {
        const fila = document.createElement("tr");
        fila.className = "hover:bg-slate-50/80 transition-colors";
        fila.dataset.alumnoId = alumno.id;

        const celdaFoto = document.createElement("td");
        celdaFoto.className = "p-3.5";
        if (alumno.foto_perfil_url) {
            const foto = document.createElement("img");
            foto.src = alumno.foto_perfil_url;
            foto.alt = `Foto de ${alumno.nombre_completo || alumno.matricula}`;
            foto.className =
                "w-10 h-10 rounded-full object-cover border border-slate-300";
            celdaFoto.appendChild(foto);
        } else {
            const sinFoto = document.createElement("div");
            sinFoto.className =
                "w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-lg";
            sinFoto.textContent = "👤";
            sinFoto.title = "Sin foto";
            celdaFoto.appendChild(sinFoto);
        }
        fila.appendChild(celdaFoto);

        const celdaAlumno = document.createElement("td");
        celdaAlumno.className = "p-3.5";
        const matricula = document.createElement("div");
        matricula.className = "font-bold text-sky-700 text-sm";
        matricula.textContent = alumno.matricula || "Sin identificador";
        const nombre = document.createElement("div");
        nombre.className = "text-xs text-slate-500 font-medium";
        nombre.textContent = alumno.nombre_completo || "";
        celdaAlumno.append(matricula, nombre);
        fila.appendChild(celdaAlumno);

        const tipo = document.createElement("span");
        tipo.className =
            alumno.tipo === "Servicio Social"
                ? "bg-sky-100 text-sky-800 text-xs font-bold px-3 py-1 rounded-full border border-sky-200"
                : "bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full border border-purple-200";
        tipo.textContent = alumno.tipo || "Sin tipo";
        const celdaTipo = document.createElement("td");
        celdaTipo.className = "p-3.5";
        celdaTipo.appendChild(tipo);
        fila.appendChild(celdaTipo);

        fila.appendChild(
            crearCeldaAlumno(
                `📅 ${formatearFechaAlumno(alumno.fecha_inicio)}`,
                "p-3.5 text-xs text-slate-600 font-semibold"
            )
        );

        const horasAcumuladas = Number(alumno.horas_acumuladas) || 0;
        const horasObjetivo = Number(alumno.horas_objetivo) || 480;
        const porcentaje = Math.min(
            100,
            Math.max(0, Math.round((horasAcumuladas / horasObjetivo) * 100))
        );
        const celdaAvance = document.createElement("td");
        celdaAvance.className = "p-3.5";
        const textoAvance = document.createElement("div");
        textoAvance.className = "text-xs font-bold text-slate-800 mb-1";
        textoAvance.textContent = `${porcentaje}%`;
        const barraFondo = document.createElement("div");
        barraFondo.className = "w-32 bg-slate-200 rounded-full h-2 overflow-hidden";
        const barra = document.createElement("div");
        barra.className = "bg-indigo-600 h-2 rounded-full";
        barra.style.width = `${porcentaje}%`;
        barraFondo.appendChild(barra);
        celdaAvance.append(textoAvance, barraFondo);
        fila.appendChild(celdaAvance);

        const celdaHoras = document.createElement("td");
        celdaHoras.className = "p-3.5 text-xs";
        const horas = document.createElement("span");
        horas.className = "font-bold text-emerald-600 text-sm";
        horas.textContent = horasAcumuladas.toFixed(1);
        const objetivo = document.createElement("span");
        objetivo.className = "text-slate-500 font-semibold";
        objetivo.textContent = ` / ${horasObjetivo} hrs`;
        celdaHoras.append(horas, objetivo);
        fila.appendChild(celdaHoras);

        const celdaAcciones = document.createElement("td");
        celdaAcciones.className = "p-3.5";
        const acciones = document.createElement("div");
        acciones.className = "flex flex-col gap-1.5 items-center";

        const botonHoras = document.createElement("button");
        botonHoras.type = "button";
        botonHoras.dataset.accionAlumno = "horas";
        botonHoras.className =
            "w-28 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm";
        botonHoras.textContent = "✏️ Horas";

        const botonFoto = document.createElement("button");
        botonFoto.type = "button";
        botonFoto.dataset.accionAlumno = "foto";
        botonFoto.className =
            "w-28 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-300 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm";
        botonFoto.textContent = "📷 Cambiar Foto";

        acciones.append(botonHoras, botonFoto);
        celdaAcciones.appendChild(acciones);
        fila.appendChild(celdaAcciones);
        tabla.appendChild(fila);
    }
}

async function cargarAlumnosPanel() {
    const tabla = document.getElementById("tabla-alumnos");
    if (!tabla) {
        return;
    }

    mostrarMensajeTabla("Cargando alumnos...");

    try {
        const { data: alumnos, error } =
            await window.supabaseClient
                .from("alumnos")
                .select("*, instituciones(nombre)");

        if (error) {
            throw error;
        }

        renderizarAlumnos(alumnos || []);
    } catch (error) {
        console.error("No se pudieron cargar los alumnos:", error);
        mostrarMensajeTabla(
            "No se pudieron cargar los alumnos. Revisa tu conexión y los permisos de la organización."
        );
    }
}

async function cargarInstitucionesPanel() {
    const selector = document.getElementById("alum-institucion");
    if (!selector) {
        return;
    }

    selector.replaceChildren();
    const opcionCarga = document.createElement("option");
    opcionCarga.value = "";
    opcionCarga.textContent = "Cargando instituciones...";
    selector.appendChild(opcionCarga);
    selector.disabled = true;

    try {
        const { data: instituciones, error } =
            await window.supabaseClient
                .from("instituciones")
                .select("*");

        if (error) {
            throw error;
        }

        const listaInstituciones = instituciones || [];
        selector.replaceChildren();
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = listaInstituciones.length
            ? "Institución"
            : "No hay instituciones registradas";
        selector.appendChild(placeholder);

        for (const institucion of listaInstituciones) {
            const opcion = document.createElement("option");
            opcion.value = institucion.id;
            opcion.textContent =
                `${institucion.nombre} (${institucion.carrera || "General"})`;
            selector.appendChild(opcion);
        }

        selector.disabled = listaInstituciones.length === 0;
    } catch (error) {
        console.error("No se pudieron cargar las instituciones:", error);
        selector.replaceChildren();
        const opcionError = document.createElement("option");
        opcionError.value = "";
        opcionError.textContent = "Error al cargar instituciones";
        selector.appendChild(opcionError);
        selector.disabled = true;
    }
}

function mostrarMensajeInstitucion(mensaje, tipo) {
    const elemento = document.getElementById("mensaje-institucion");
    if (!elemento) {
        return;
    }

    elemento.textContent = mensaje;
    elemento.className =
        tipo === "error"
            ? "text-sm font-semibold text-red-700"
            : "text-sm font-semibold text-emerald-700";
}

function seleccionarInstitucionEnFormulario(institucion) {
    const selector = document.getElementById("alum-institucion");
    if (!selector) {
        return;
    }

    const id = String(institucion.id);
    let opcion = Array.from(selector.options).find(
        (item) => item.value === id
    );

    if (!opcion) {
        opcion = document.createElement("option");
        opcion.value = id;
        opcion.textContent =
            `${institucion.nombre} (${institucion.carrera || "General"})`;
        selector.appendChild(opcion);
    }

    selector.disabled = false;
    selector.value = id;
}

async function guardarInstitucionPanel(event) {
    event.preventDefault();

    const nombre =
        document.getElementById("inst-nombre").value.trim();
    const carrera =
        document.getElementById("inst-carrera").value.trim();
    const responsable =
        document.getElementById("inst-responsable").value.trim();
    const boton = event.currentTarget.querySelector(
        'button[type="submit"]'
    );

    if (!nombre) {
        mostrarMensajeInstitucion(
            "Escribe el nombre de la institución.",
            "error"
        );
        return;
    }

    mostrarMensajeInstitucion("Guardando institución...", "success");

    if (boton) {
        boton.disabled = true;
        boton.textContent = "Guardando...";
    }

    try {
        const { data: institucion, error } = await window.supabaseClient
            .from("instituciones")
            .insert([{ nombre, carrera, responsable }])
            .select("id, nombre, carrera")
            .single();

        if (error) {
            throw error;
        }

        if (!institucion) {
            throw new Error(
                "La base de datos no confirmó la institución guardada."
            );
        }

        event.currentTarget.reset();
        await cargarInstitucionesPanel();
        seleccionarInstitucionEnFormulario(institucion);
        mostrarMensajeInstitucion(
            `${institucion.nombre} quedó registrada y seleccionada en el formulario de alumno.`,
            "success"
        );
    } catch (error) {
        console.error("No se pudo registrar la institución:", error);
        mostrarMensajeInstitucion(
            `No se pudo registrar la institución: ${error.message || error}`,
            "error"
        );
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = "Guardar Institución";
        }
    }
}

async function editarHorasAlumno(alumno) {
    const totalActual = Number(alumno.horas_acumuladas) || 0;
    const nuevoTotal = window.prompt(
        `Ingresa las nuevas horas acumuladas para ${alumno.nombre_completo || alumno.matricula}:`,
        String(totalActual)
    );

    if (nuevoTotal === null) {
        return;
    }

    const total = Number(nuevoTotal);
    if (!nuevoTotal.trim() || !Number.isFinite(total) || total < 0) {
        window.alert("Ingresa una cantidad de horas válida (cero o mayor).");
        return;
    }

    try {
        const { error } = await window.supabaseClient
            .from("alumnos")
            .update({
                horas_acumuladas: total,
                horas_iniciales: total
            })
            .eq("id", alumno.id);

        if (error) {
            throw error;
        }

        await cargarAlumnosPanel();
        window.alert("Las horas del alumno se actualizaron correctamente.");
    } catch (error) {
        console.error("No se pudieron actualizar las horas:", error);
        window.alert(`No se pudieron actualizar las horas: ${error.message || error}`);
    }
}

async function cambiarFotoAlumno(alumno) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", async () => {
        const archivo = input.files && input.files[0];
        if (!archivo) {
            return;
        }

        if (!archivo.type.startsWith("image/")) {
            window.alert("Selecciona un archivo de imagen válido.");
            return;
        }

        const extensionArchivo = archivo.name.match(/\.([a-z0-9]+)$/i);
        const extension = extensionArchivo
            ? extensionArchivo[1].toLowerCase()
            : "jpg";
        const rutaFoto =
            `perfil_${alumno.id}_${Date.now()}.${extension}`;
        let fotoSubida = false;

        try {
            const { error: errorSubida } =
                await window.supabaseClient.storage
                    .from("asistencias-fotos")
                    .upload(rutaFoto, archivo, {
                        contentType: archivo.type,
                        upsert: true
                    });

            if (errorSubida) {
                throw errorSubida;
            }
            fotoSubida = true;

            const { data } = window.supabaseClient.storage
                .from("asistencias-fotos")
                .getPublicUrl(rutaFoto);

            if (!data || !data.publicUrl) {
                throw new Error("Storage no devolvió la URL pública de la foto.");
            }

            const { data: alumnoActualizado, error: errorActualizacion } =
                await window.supabaseClient
                    .from("alumnos")
                    .update({ foto_perfil_url: data.publicUrl })
                    .eq("id", alumno.id)
                    .select("id")
                    .maybeSingle();

            if (errorActualizacion) {
                throw errorActualizacion;
            }
            if (!alumnoActualizado) {
                throw new Error(
                    "No se actualizó ningún alumno. Verifica que tengas permisos."
                );
            }

            await cargarAlumnosPanel();
            window.alert("La foto del alumno se actualizó correctamente.");
        } catch (error) {
            console.error("No se pudo actualizar la foto del alumno:", error);
            if (fotoSubida) {
                const { error: errorLimpieza } =
                    await window.supabaseClient.storage
                        .from("asistencias-fotos")
                        .remove([rutaFoto]);
                if (errorLimpieza) {
                    console.error("No se pudo limpiar la foto subida:", errorLimpieza);
                }
            }
            window.alert(`No se pudo actualizar la foto: ${error.message || error}`);
        }
    });
    input.click();
}

function inicializarPanelAdmin() {
    const formularioInstitucion =
        document.getElementById("form-institucion");
    if (formularioInstitucion) {
        formularioInstitucion.addEventListener(
            "submit",
            guardarInstitucionPanel
        );
    }

    cargarInstitucionesPanel();

    const tabla = document.getElementById("tabla-alumnos");
    if (!tabla) {
        return;
    }

    tabla.addEventListener("click", (event) => {
        const boton = event.target.closest("button[data-accion-alumno]");
        if (!boton) {
            return;
        }

        const fila = boton.closest("tr[data-alumno-id]");
        if (!fila) {
            return;
        }

        const alumno = window.alumnosPanelPorId?.get(
            String(fila.dataset.alumnoId)
        );
        if (!alumno) {
            return;
        }

        if (boton.dataset.accionAlumno === "horas") {
            editarHorasAlumno(alumno);
        } else if (boton.dataset.accionAlumno === "foto") {
            cambiarFotoAlumno(alumno);
        }
    });

    cargarAlumnosPanel();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarPanelAdmin,
        { once: true }
    );
} else {
    inicializarPanelAdmin();
}
