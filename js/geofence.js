// js/geofence.js

// Coordenadas fijas de la oficina
const LATITUD_OFICINA = 16.768329;
const LONGITUD_OFICINA = -93.134041;
const RANGO_MAXIMO_METROS = 100; // Distancia máxima permitida

/**
 * Calcula la distancia en metros entre dos coordenadas usando la fórmula de Haversine.
 */
function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Obtiene la ubicación GPS del dispositivo del alumno y valida si está dentro del rango.
 */
function obtenerYValidarUbicacion() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject('Tu navegador o dispositivo no soporta la función de geolocalización.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (posicion) => {
                const latAlumno = posicion.coords.latitude;
                const lonAlumno = posicion.coords.longitude;

                const distancia = calcularDistanciaMetros(
                    latAlumno,
                    lonAlumno,
                    LATITUD_OFICINA,
                    LONGITUD_OFICINA
                );

                const estaDentro = distancia <= RANGO_MAXIMO_METROS;

                resolve({
                    valido: estaDentro,
                    distanciaMetros: Math.round(distancia),
                    latitud: latAlumno,
                    longitud: lonAlumno
                });
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        reject('Debes activar el GPS y dar permiso de ubicación en tu navegador.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject('No se pudo obtener la señal del GPS. Inténtalo de nuevo.');
                        break;
                    case error.TIMEOUT:
                        reject('Se agotó el tiempo de espera para obtener tu ubicación GPS.');
                        break;
                    default:
                        reject('Ocurrió un error al obtener la ubicación.');
                }
            },
            {
                enableHighAccuracy: true, // Forzar GPS de alta precisión
                timeout: 12000,
                maximumAge: 0
            }
        );
    });
}