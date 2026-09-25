// js/admin.js
document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];

    // Establecer fechas actuales por defecto
    const fechaInput = document.getElementById('alum-fecha-inicio');
    if (fechaInput) fechaInput.value = hoy;

    const fechaEntrada = document.getElementById('entrada-fecha');
    if (fechaEntrada) fechaEntrada.value = hoy;

    cargarInstituciones();
    cargarAlumnos();

    document.getElementById('form-institucion')?.addEventListener('submit', guardarInstitucion);
    document.getElementById('form-alumno')?.addEventListener('submit', guardarAlumno);
    document.getElementById('form-entrada')?.addEventListener('submit', guardarEntrada);
});

async function cargarInstituciones() {
    const client = window.supabaseClient;
    if (!client) return console.error('Supabase no está inicializado.');

    const { data, error } = await client.from('instituciones').select('*');
    if (error) return console.error(error);

    const select = document.getElementById('alum-institucion');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecciona una opción</option>';
    data.forEach(inst => {
        select.innerHTML += `<option value="${inst.id}">${inst.nombre} (${inst.carrera || 'General'})</option>`;
    });
}

async function guardarInstitucion(e) {
    e.preventDefault();
    const client = window.supabaseClient;
    
    const nombre = document.getElementById('inst-nombre').value.trim();
    const carrera = document.getElementById('inst-carrera').value.trim();
    const responsable = document.getElementById('inst-responsable').value.trim();

    const { error } = await client.from('instituciones').insert([{ nombre, carrera, responsable }]);
    if (error) {
        alert('Error al guardar institución');
    } else {
        alert('Institución guardada con éxito');
        e.target.reset();
        cargarInstituciones();
    }
}

async function guardarAlumno(e) {
    e.preventDefault();
    const client = window.supabaseClient;

    const btnGuardar = document.getElementById('btn-guardar-alumno');
    const matricula = document.getElementById('alum-matricula').value.trim();
    const nombre_completo = document.getElementById('alum-nombre').value.trim();
    let tipo = document.getElementById('alum-tipo').value;
    const instVal = document.getElementById('alum-institucion').value;
    const fecha_inicio = document.getElementById('alum-fecha-inicio').value;
    const inputFoto = document.getElementById('alum-foto');
    
    const horas_objetivo = parseFloat(document.getElementById('alum-horas-obj').value) || 480;
    const horas_iniciales = parseFloat(document.getElementById('alum-horas-previas').value) || 0;
    const horas_acumuladas = horas_iniciales;

    if (!inputFoto.files || inputFoto.files.length === 0) {
        return alert('Por favor selecciona una foto oficial para el alumno.');
    }

    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.innerText = '⏳ Subiendo foto y guardando...';
    }

    try {
        // 1. Subir Foto a Supabase Storage
        const archivoFoto = inputFoto.files[0];
        const extension = archivoFoto.name.split('.').pop();
        const nombreArchivo = `perfil_${matricula}_${Date.now()}.${extension}`;

        const { error: uploadError } = await client.storage
            .from('asistencias-fotos')
            .upload(nombreArchivo, archivoFoto, { contentType: archivoFoto.type, upsert: true });

        if (uploadError) {
            throw new Error('Error al subir la imagen a Storage: ' + uploadError.message);
        }

        // 2. Obtener URL Pública
        const { data: urlData } = client.storage
            .from('asistencias-fotos')
            .getPublicUrl(nombreArchivo);

        const foto_perfil_url = urlData?.publicUrl;

        // Ajuste de tipo para coincidir con la restricción de Supabase
        if (tipo === 'Residencia') {
            tipo = 'Residencias';
        }

        // Formatear institucion_id a entero o null
        let institucion_id = null;
        if (instVal !== "") {
            institucion_id = !isNaN(instVal) ? parseInt(instVal, 10) : instVal;
        }

        // 3. Insertar Alumno en Supabase
        const { error } = await client.from('alumnos').insert([{
            matricula,
            nombre_completo,
            tipo,
            institucion_id,
            fecha_inicio,
            horas_objetivo,
            horas_iniciales,
            horas_acumuladas,
            foto_perfil_url
        }]);

        if (error) {
            throw new Error(`Error al guardar alumno: ${error.message || 'Verifica los datos o que la matrícula no esté duplicada.'}`);
        }

        alert('✅ Alumno guardado con éxito con su foto de perfil.');
        e.target.reset();
        document.getElementById('alum-fecha-inicio').value = new Date().toISOString().split('T')[0];
        cargarAlumnos();

    } catch (err) {
        console.error(err);
        alert(`❌ ${err.message || err}`);
    } finally {
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerText = 'Guardar Alumno';
        }
    }
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return 'N/A';
    const partes = fechaStr.split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fechaStr;
}

async function cargarAlumnos() {
    const client = window.supabaseClient;
    if (!client) return console.error('Supabase no está inicializado.');

    const { data: alumnos, error } = await client
        .from('alumnos')
        .select('*, instituciones(nombre)');

    if (error) return console.error(error);

    // Llenar tabla de alumnos
    const tbody = document.getElementById('tabla-alumnos');
    if (tbody) tbody.innerHTML = '';

    // Llenar select del formulario de entrada
    const selectEntrada = document.getElementById('entrada-alumno');
    if (selectEntrada) {
        selectEntrada.innerHTML = '<option value="">Selecciona un alumno</option>';
    }

    alumnos.forEach(alum => {
        // Opción para select de entrada
        if (selectEntrada) {
            selectEntrada.innerHTML += `<option value="${alum.id}">${alum.nombre_completo} (${alum.matricula})</option>`;
        }

        // Fila para tabla de alumnos (Adaptada a Modo Claro)
        if (tbody) {
            const hAcum = parseFloat(alum.horas_acumuladas || 0);
            const hObj = parseFloat(alum.horas_objetivo || 480);
            const hPrev = parseFloat(alum.horas_iniciales || 0);
            const porcentaje = Math.min(100, Math.round((hAcum / hObj) * 100));
            const fechaFormateada = formatearFecha(alum.fecha_inicio);
            
            const avatarHtml = alum.foto_perfil_url 
                ? `<img src="${alum.foto_perfil_url}" alt="Foto" class="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-sm">`
                : `<div class="w-11 h-11 rounded-full bg-slate-400 text-white flex flex-col items-center justify-center text-[10px] font-bold leading-tight border border-slate-300"><span>Sin</span><span>foto</span></div>`;

            const esServicio = alum.tipo === 'Servicio Social';
            const badgeClass = esServicio 
                ? 'bg-[#E0F2FE] text-[#0369A1] border-sky-100' 
                : 'bg-[#F3E8FF] text-[#7E22CE] border-purple-100';

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50/50 transition-colors">
                    <td class="p-4">
                        ${avatarHtml}
                    </td>
                    <td class="p-4">
                        <div class="font-bold text-slate-900 text-sm tracking-tight">${alum.nombre_completo}</div>
                        <div class="font-bold text-[#4338CA] text-xs">${alum.matricula}</div>
                        <div class="text-xs text-slate-400 font-semibold uppercase">${alum.instituciones?.nombre || 'Sin institución'}</div>
                    </td>
                    <td class="p-4">
                        <span class="${badgeClass} text-xs font-bold px-3.5 py-1.5 rounded-full inline-block border">
                            ${alum.tipo}
                        </span>
                    </td>
                    <td class="p-4 text-xs text-slate-700 font-semibold">
                        <span class="mr-1">📅</span> ${fechaFormateada}
                    </td>
                    <td class="p-4">
                        <div class="text-xs font-black text-slate-900 mb-1.5">${porcentaje}%</div>
                        <div class="w-36 bg-[#64748B]/20 rounded-full h-2.5 overflow-hidden">
                            <div class="bg-[#4F46E5] h-2.5 rounded-full transition-all duration-500" style="width: ${porcentaje}%"></div>
                        </div>
                    </td>
                    <td class="p-4 text-xs font-bold">
                        <span class="text-[#16A34A] text-sm">${hAcum.toFixed(1)}</span> <span class="text-slate-600 font-medium">/ ${hObj} hrs</span>
                    </td>
                    <td class="p-4">
                        <div class="flex flex-col gap-1.5 items-end">
                            <button onclick="editarHorasPrevias(${alum.id}, ${hPrev}, ${hAcum})" class="w-32 bg-[#D97706] hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer">
                                ✏️ Horas
                            </button>
                            <button onclick="actualizarFotoExistente(${alum.id}, '${alum.matricula}')" class="w-32 bg-[#4F46E5] hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer">
                                📷 Cambiar Foto
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    });
}

async function actualizarFotoExistente(id, matricula) {
    const client = window.supabaseClient;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;

        alert('Subiendo nueva foto...');

        const extension = archivo.name.split('.').pop();
        const nombreArchivo = `perfil_${matricula}_${Date.now()}.${extension}`;

        const { error: uploadError } = await client.storage
            .from('asistencias-fotos')
            .upload(nombreArchivo, archivo, { contentType: archivo.type, upsert: true });

        if (uploadError) return alert('Error al subir foto: ' + uploadError.message);

        const { data: urlData } = client.storage.from('asistencias-fotos').getPublicUrl(nombreArchivo);

        const { error: updateError } = await client
            .from('alumnos')
            .update({ foto_perfil_url: urlData.publicUrl })
            .eq('id', id);

        if (updateError) {
            alert('Error al actualizar en base de datos: ' + updateError.message);
        } else {
            alert('✅ Foto de perfil actualizada correctamente.');
            cargarAlumnos();
        }
    };

    input.click();
}

async function guardarEntrada(e) {
    e.preventDefault();
    const client = window.supabaseClient;

    const alumno_id = parseInt(document.getElementById('entrada-alumno').value);
    const fecha = document.getElementById('entrada-fecha').value;
    let hora_entrada = document.getElementById('entrada-hora').value;

    if (!alumno_id) {
        alert('Por favor selecciona un alumno.');
        return;
    }

    if (hora_entrada && hora_entrada.split(':').length === 2) {
        hora_entrada = `${hora_entrada}:00`;
    }

    const { data: existentes, error: errConsulta } = await client
        .from('asistencias')
        .select('id')
        .eq('alumno_id', alumno_id)
        .eq('fecha', fecha)
        .is('hora_salida', null)
        .limit(1);

    if (errConsulta) {
        console.error('Error al verificar asistencias:', errConsulta);
    }

    if (existentes && existentes.length > 0) {
        alert('Este alumno ya tiene una entrada registrada sin salida en la fecha seleccionada.');
        return;
    }

    const { error } = await client.from('asistencias').insert([{
        alumno_id: alumno_id,
        fecha: fecha,
        hora_entrada: hora_entrada
    }]);

    if (error) {
        alert('Error al registrar la entrada.');
        console.error(error);
    } else {
        alert('Hora de entrada asignada al alumno correctamente.');
        e.target.reset();
        document.getElementById('entrada-fecha').value = new Date().toISOString().split('T')[0];
        cargarAlumnos();
    }
}

async function editarHorasPrevias(id, horasPreviasActuales, horasAcumuladasActuales) {
    const client = window.supabaseClient;
    
    const nuevasHorasTotales = prompt(
        'Ingresa las NUEVAS HORAS ACUMULADAS para este alumno:',
        horasAcumuladasActuales
    );
    
    if (nuevasHorasTotales === null) return;

    const hTotalesNum = parseFloat(nuevasHorasTotales);
    if (isNaN(hTotalesNum) || hTotalesNum < 0) {
        alert('Por favor ingresa un número válido.');
        return;
    }

    const { error } = await client
        .from('alumnos')
        .update({
            horas_acumuladas: hTotalesNum,
            horas_iniciales: hTotalesNum
        })
        .eq('id', id);

    if (error) {
        console.error('Error al actualizar horas:', error);
        alert('Error al actualizar horas en la base de datos.');
    } else {
        alert('Horas actualizadas correctamente.');
        cargarAlumnos();
    }
}