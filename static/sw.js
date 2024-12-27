const CACHE_VERSION = 'v1';
const CACHE_NAME = `site-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `site-dynamic-${CACHE_VERSION}`;

// Assets to precache
const ASSETS = [
'/',
'/offline.html',
'/css/style.css',
'/js/script.js',
'/images/logo.png'
];

// Install event - precache static assets
self.addEventListener('install', event => {
event.waitUntil(
    caches.open(CACHE_NAME)
    .then(cache => {
        console.log('Caching shell assets');
        return cache.addAll(ASSETS);
    })
);
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
event.waitUntil(
    caches.keys().then(keys => {
    return Promise.all(keys
        .filter(key => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
        .map(key => caches.delete(key))
    );
    })
);
});

// Fetch event - cache-first strategy for static assets, network-first for pages
self.addEventListener('fetch', event => {
// Skip non-GET requests
if (event.request.method !== 'GET') return;

// Handle static assets (cache first)
if (event.request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp)$/)) {
    event.respondWith(
    caches.match(event.request)
        .then(cacheRes => {
        return cacheRes || fetch(event.request).then(fetchRes => {
            return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request.url, fetchRes.clone());
            return fetchRes;
            });
        });
        })
        .catch(() => {
        if (event.request.url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
            return caches.match('/images/fallback.png');
        }
        })
    );
    return;
}

// Handle pages (network first)
event.respondWith(
    fetch(event.request)
    .then(fetchRes => {
        const resClone = fetchRes.clone();
        caches.open(DYNAMIC_CACHE)
        .then(cache => {
            cache.put(event.request, resClone);
        });
        return fetchRes;
    })
    .catch(() => {
        return caches.match(event.request)
        .then(cacheRes => {
            return cacheRes || caches.match('/offline.html');
        });
    })
);
});

// Background sync
self.addEventListener('sync', event => {
if (event.tag === 'sync-data') {
    event.waitUntil(
    // Implement background sync logic here
    syncData()
    );
}
});

// Helper function for background sync
async function syncData() {
try {
    const dataQueue = await getDataFromIndexedDB();
    // Process queued data
    await sendQueuedData(dataQueue);
} catch (error) {
    console.error('Background sync failed:', error);
}
}

