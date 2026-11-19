// ============================================================
//  SERVICE WORKER AVANCÉ - ADMIN NELIA
// ============================================================

const CACHE_VERSION = 'nelia-admin-v3.0.0';
const CACHE_STATIC = 'nelia-admin-static-v3';
const CACHE_DYNAMIC = 'nelia-admin-dynamic-v3';

const STATIC_FILES = [
    'admin.html',
    'manifest-admin.json',
    'offline.html',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// INSTALLATION
self.addEventListener('install', event => {
    console.log('📦 Admin SW - Installation');
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then(cache => cache.addAll(STATIC_FILES))
            .then(() => self.skipWaiting())
            .catch(err => console.error('❌ Erreur:', err))
    );
});

// ACTIVATION
self.addEventListener('activate', event => {
    console.log('✅ Admin SW - Activation');
    event.waitUntil(
        caches.keys().then(names => {
            return Promise.all(
                names.map(name => {
                    if (![CACHE_STATIC, CACHE_DYNAMIC].includes(name)) {
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// FETCH
self.addEventListener('fetch', event => {
    const { request } = event;

    if (request.method !== 'GET') return;

    // Pages HTML
    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_DYNAMIC).then(cache => cache.put(request, clone));
                    return response;
                })
                .catch(() => caches.match(request).then(c => c || caches.match('admin.html')))
        );
        return;
    }

    // Assets
    event.respondWith(
        caches.match(request).then(cached => {
            const fetchPromise = fetch(request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_DYNAMIC).then(cache => cache.put(request, clone));
                }
                return response;
            }).catch(() => cached);

            return cached || fetchPromise;
        })
    );
});

// NOTIFICATIONS
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    event.waitUntil(
        self.registration.showNotification(
            data.title || '👑 Admin Nelia',
            {
                body: data.body || 'Nouvelle activité',
                icon: 'imicon/admin-192x192.png',
                badge: 'imicon/admin-192x192.png',
                vibrate: [200, 100, 200],
                data: { url: data.url || 'admin.html' }
            }
        )
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url || 'admin.html')
    );
});