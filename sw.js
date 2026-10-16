const CACHE_NAME = "horario-cache-v2";

const APP_SHELL = [
    "/",
    "/index.html",
    "/horario.html",
    "/js/config.js",
    "/js/app.js",
    "/js/offline-db.js"
];


// =====================================================
// CONVERTIR RESPUESTA REDIRIGIDA EN RESPUESTA NORMAL
// =====================================================

async function normalizarRespuesta(response) {

    if (!response) {
        return response;
    }

    if (!response.redirected) {
        return response;
    }

    const body =
        await response.clone().blob();

    return new Response(
        body,
        {
            status:
                response.status,

            statusText:
                response.statusText,

            headers:
                response.headers
        }
    );

}


// =====================================================
// INSTALACIÓN
// =====================================================

self.addEventListener(
    "install",
    (event) => {

        event.waitUntil(

            (async () => {

                const cache =
                    await caches.open(
                        CACHE_NAME
                    );


                for (
                    const url
                    of APP_SHELL
                ) {

                    try {

                        const response =
                            await fetch(
                                url,
                                {
                                    redirect:
                                        "follow"
                                }
                            );


                        if (
                            !response.ok
                        ) {

                            console.warn(
                                "No se pudo precargar:",
                                url,
                                response.status
                            );

                            continue;

                        }


                        const respuestaNormal =
                            await normalizarRespuesta(
                                response
                            );


                        await cache.put(
                            url,
                            respuestaNormal
                        );


                    } catch (error) {

                        console.warn(
                            "No se pudo precargar:",
                            url,
                            error
                        );

                    }

                }

            })()

        );


        self.skipWaiting();

    }
);


// =====================================================
// ACTIVACIÓN
// =====================================================

self.addEventListener(
    "activate",
    (event) => {

        event.waitUntil(

            (async () => {

                const keys =
                    await caches.keys();


                await Promise.all(

                    keys
                        .filter(
                            (key) =>
                                key !==
                                CACHE_NAME
                        )
                        .map(
                            (key) =>
                                caches.delete(
                                    key
                                )
                        )

                );


                await self.clients.claim();

            })()

        );

    }
);


// =====================================================
// PETICIONES
// =====================================================

self.addEventListener(
    "fetch",
    (event) => {

        const request =
            event.request;


        if (
            request.method !==
            "GET"
        ) {

            return;

        }


        const url =
            new URL(
                request.url
            );


        // Supabase debe ir directamente a internet
        if (
            url.hostname.includes(
                "supabase.co"
            )
        ) {

            return;

        }


        // Navegaciones HTML
        if (
            request.mode ===
            "navigate"
        ) {

            event.respondWith(
                manejarNavegacion(
                    request
                )
            );

            return;

        }


        // Archivos locales
        if (
            url.origin ===
            self.location.origin
        ) {

            event.respondWith(
                cacheFirst(
                    request
                )
            );

            return;

        }


        // Librerías externas
        event.respondWith(
            networkFirst(
                request
            )
        );

    }
);


// =====================================================
// NAVEGACIÓN
// =====================================================

async function manejarNavegacion(
    request
) {

    const cache =
        await caches.open(
            CACHE_NAME
        );


    try {

        const response =
            await fetch(
                request,
                {
                    redirect:
                        "follow"
                }
            );


        const respuestaNormal =
            await normalizarRespuesta(
                response
            );


        if (
            respuestaNormal &&
            respuestaNormal.ok
        ) {

            await cache.put(
                request.url,
                respuestaNormal.clone()
            );

        }


        return respuestaNormal;


    } catch (error) {

        // Primero intentar exactamente la página solicitada
        const exacta =
            await cache.match(
                request.url
            );


        if (
            exacta
        ) {

            return exacta;

        }


        // Si estamos entrando al control
        if (
            request.url.includes(
                "horario"
            )
        ) {

            const horario =
                await cache.match(
                    "/horario.html"
                );


            if (
                horario
            ) {

                return horario;

            }

        }


        // Página principal
        const inicio =
            await cache.match(
                "/index.html"
            );


        if (
            inicio
        ) {

            return inicio;

        }


        throw error;

    }

}


// =====================================================
// CACHE FIRST
// =====================================================

async function cacheFirst(
    request
) {

    const cache =
        await caches.open(
            CACHE_NAME
        );


    const cached =
        await cache.match(
            request
        );


    if (
        cached
    ) {

        return cached;

    }


    try {

        const response =
            await fetch(
                request,
                {
                    redirect:
                        "follow"
                }
            );


        if (
            response &&
            response.ok
        ) {

            const respuestaNormal =
                await normalizarRespuesta(
                    response
                );


            await cache.put(
                request,
                respuestaNormal.clone()
            );


            return respuestaNormal;

        }


        return response;


    } catch (error) {

        throw error;

    }

}


// =====================================================
// NETWORK FIRST
// =====================================================

async function networkFirst(
    request
) {

    const cache =
        await caches.open(
            CACHE_NAME
        );


    try {

        const response =
            await fetch(
                request,
                {
                    redirect:
                        "follow"
                }
            );


        if (
            response &&
            (
                response.ok ||
                response.type ===
                "opaque"
            )
        ) {

            if (
                response.type ===
                "opaque"
            ) {

                await cache.put(
                    request,
                    response.clone()
                );


                return response;

            }


            const respuestaNormal =
                await normalizarRespuesta(
                    response
                );


            await cache.put(
                request,
                respuestaNormal.clone()
            );


            return respuestaNormal;

        }


        return response;


    } catch (error) {

        const cached =
            await cache.match(
                request
            );


        if (
            cached
        ) {

            return cached;

        }


        throw error;

    }

}