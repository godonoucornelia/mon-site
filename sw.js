// ============================================================
//  SERVICE WORKER AVANCÉ - NELIA
// ============================================================

const CACHE_VERSION = 'nelia-v3.0.0';
const CACHE_STATIC = 'nelia-static-v3';
const CACHE_DYNAMIC = 'nelia-dynamic-v3';
const CACHE_IMAGES = 'nelia-images-v3';

// Fichiers essentiels à mettre en cache immédiatement
const STATIC_FILES = [
    './',
    'index.html',
    'offline.html',
    'manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// ============================================================
//  INSTALLATION
// ============================================================
self.addEventListener('install', event => {
    console.log('📦 Service Worker Nelia - Installation');
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then(cache => {
                console.log('📦 Mise en cache des fichiers statiques');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => self.skipWaiting())
            .catch(err => console.error('❌ Erreur cache:', err))
    );
});

// ============================================================
//  ACTIVATION
// ============================================================
self.addEventListener('activate', event => {
    console.log('✅ Service Worker Nelia - Activation');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (![CACHE_STATIC, CACHE_DYNAMIC, CACHE_IMAGES].includes(cacheName)) {
                        console.log('🗑️ Suppression ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ============================================================
//  FETCH - STRATÉGIE INTELLIGENTE
// ============================================================
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorer les requêtes non-GET
    if (request.method !== 'GET') return;

    // Ignorer les requêtes Chrome Extension
    if (url.protocol === 'chrome-extension:') return;

    // ==========================================
    //  STRATÉGIE 1 : Images (Cache First)
    // ==========================================
    if (request.destination === 'image') {
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached;
                
                return fetch(request).then(response => {
                    if (!response || response.status !== 200) return response;
                    
                    const responseClone = response.clone();
                    caches.open(CACHE_IMAGES).then(cache => {
                        cache.put(request, responseClone);
                    });
                    return response;
                }).catch(() => {
                    // Image par défaut si hors ligne
                    return caches.match('imicon/icon-192x192.png');
                });
            })
        );
        return;
    }

    // ==========================================
    //  STRATÉGIE 2 : Pages HTML (Network First)
    // ==========================================
    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const responseClone = response.clone();
                    caches.open(CACHE_DYNAMIC).then(cache => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Hors ligne → page offline
                    return caches.match(request)
                        .then(cached => cached || caches.match('offline.html'));
                })
        );
        return;
    }

    // ==========================================
    //  STRATÉGIE 3 : Assets (Stale While Revalidate)
    // ==========================================
    event.respondWith(
        caches.match(request).then(cached => {
            const fetchPromise = fetch(request).then(response => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_DYNAMIC).then(cache => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            }).catch(() => cached);

            return cached || fetchPromise;
        })
    );
});

// ============================================================
//  NOTIFICATIONS PUSH
// ============================================================
self.addEventListener('push', event => {
    console.log('🔔 Notification push reçue');
    
    const data = event.data ? event.data.json() : {};
    const title = data.title || '🧶 Nelia';
    const options = {
        body: data.body || 'Nouvelle création disponible !',
        icon: data.icon || 'imicon/icon-192x192.png',
        badge: data.badge || 'imicon/icon-96x96.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'nelia-notification',
        requireInteraction: data.requireInteraction || false,
        data: {
            url: data.url || '/',
            dateOfArrival: Date.now()
        },
        actions: data.actions || [
            { action: 'open', title: 'Voir' },
            { action: 'close', title: 'Fermer' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ============================================================
//  CLIC SUR NOTIFICATION
// ============================================================
self.addEventListener('notificationclick', event => {
    console.log('👆 Clic sur notification');
    event.notification.close();

    if (event.action === 'close') return;

    const urlToOpen = event.notification.data.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(windowClients => {
                // Si une fenêtre est déjà ouverte, la focus
                for (let client of windowClients) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Sinon, en ouvrir une nouvelle
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// ============================================================
//  SYNCHRONISATION EN ARRIÈRE-PLAN
// ============================================================
self.addEventListener('sync', event => {
    console.log('🔄 Synchronisation:', event.tag);
    
    if (event.tag === 'sync-commandes') {
        event.waitUntil(syncCommandes());
    }
});

async function syncCommandes() {
    // Récupérer les commandes en attente
    const cache = await caches.open('nelia-pending');
    const requests = await cache.keys();
    
    return Promise.all(
        requests.map(async request => {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.delete(request);
                }
            } catch (error) {
                console.log('⏳ Nouvelle tentative plus tard');
            }
        })
    );
}

// ============================================================
//  MISE À JOUR
// ============================================================
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});