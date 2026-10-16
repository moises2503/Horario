const CACHE_NAME = "horario-cache-v3";

const APP_SHELL = [
    "/",
    "/index.html",
    "/horario.html",
    "/admin.html",
    "/js/config.js",
    "/js/auth.js",
    "/js/app.js",
    "/js/admin.js",
    "/js/offline-db.js"
];


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
                                    cache:
                                        "no-store",

                                    redirect:
                                        "follow"
                                }
                            );


                        if (
                            !response ||
                            !response.ok
                        ) {

                            console.warn(
                                "No se pudo precargar:",
                                url
                            );

                            continue;

                        }


                        await cache.put(
                            url,
                            response.clone()
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

                const claves =
                    await caches.keys();


                await Promise.all(

                    claves
                        .filter(
                            (clave) =>
                                clave !==
                                CACHE_NAME
                        )
                        .map(
                            (clave) =>
                                caches.delete(
                                    clave
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


        // =============================================
        // SUPABASE
        // =============================================

        if (
            url.hostname.includes(
                "supabase.co"
            )
        ) {

            return;

        }


        // =============================================
        // NAVEGACIÓN HTML
        // =============================================

        if (
            request.mode ===
            "navigate"
        ) {

            event.respondWith(
                networkFirstNavigation(
                    request
                )
            );

            return;

        }


        // =============================================
        // ARCHIVOS LOCALES
        // =============================================

        if (
            url.origin ===
            self.location.origin
        ) {

            /*
             * HTML, JS y CSS:
             * primero internet para obtener cambios recientes.
             *
             * Si no hay internet:
             * usar la copia en caché.
             */

            if (
                esArchivoActualizable(
                    url.pathname
                )
            ) {

                event.respondWith(
                    networkFirstLocal(
                        request
                    )
                );

                return;

            }


            /*
             * Modelos, imágenes y otros recursos:
             * primero caché.
             */

            event.respondWith(
                cacheFirst(
                    request
                )
            );

            return;

        }


        // =============================================
        // RECURSOS EXTERNOS
        // =============================================

        event.respondWith(
            networkFirstExternal(
                request
            )
        );

    }
);


// =====================================================
// ARCHIVOS QUE DEBEN ACTUALIZARSE
// =====================================================

function esArchivoActualizable(
    pathname
) {

    return (

        pathname.endsWith(
            ".html"
        ) ||

        pathname.endsWith(
            ".js"
        ) ||

        pathname.endsWith(
            ".css"
        ) ||

        pathname ===
        "/"

    );

}


// =====================================================
// NAVEGACIÓN
// NETWORK FIRST
// =====================================================

async function networkFirstNavigation(
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
                    cache:
                        "no-store",

                    redirect:
                        "follow"
                }
            );


        if (
            response &&
            response.ok
        ) {

            await cache.put(
                request,
                response.clone()
            );

        }


        return response;


    } catch (error) {

        // Primero buscar exactamente la página solicitada

        const exacta =
            await cache.match(
                request
            );


        if (
            exacta
        ) {

            return exacta;

        }


        const url =
            new URL(
                request.url
            );


        // =============================================
        // FALLBACK HORARIO
        // =============================================

        if (
            url.pathname.includes(
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


        // =============================================
        // FALLBACK ADMIN
        // =============================================

        if (
            url.pathname.includes(
                "admin"
            )
        ) {

            const admin =
                await cache.match(
                    "/admin.html"
                );


            if (
                admin
            ) {

                return admin;

            }

        }


        // =============================================
        // FALLBACK GENERAL
        // =============================================

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
// ARCHIVOS LOCALES
// NETWORK FIRST
// =====================================================

async function networkFirstLocal(
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
                    cache:
                        "no-store",

                    redirect:
                        "follow"
                }
            );


        if (
            response &&
            response.ok
        ) {

            await cache.put(
                request,
                response.clone()
            );

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

            await cache.put(
                request,
                response.clone()
            );

        }


        return response;


    } catch (error) {

        throw error;

    }

}


// =====================================================
// RECURSOS EXTERNOS
// =====================================================

async function networkFirstExternal(
    request
) {

    const cache =
        await caches.open(
            CACHE_NAME
        );


    try {

        const response =
            await fetch(
                request
            );


        if (
            response &&
            (
                response.ok ||
                response.type ===
                "opaque"
            )
        ) {

            try {

                await cache.put(
                    request,
                    response.clone()
                );

            } catch (error) {

                console.warn(
                    "No se pudo almacenar recurso externo:",
                    request.url
                );

            }

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


        /*
         * Para recursos externos que fallen,
         * no provocar un error no controlado
         * dentro del Service Worker.
         */

        return new Response(
            "",
            {
                status:
                    504,

                statusText:
                    "Recurso externo no disponible"
            }
        );

    }

}