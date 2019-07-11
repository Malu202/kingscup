var cacheName = "card-cache";
self.addEventListener("install", function (event) {
    console.log("install");
    event.waitUntil(
        caches.open(cacheName).then((cache) => {
            return Promise.all(Array.apply(null, {length: 52}).map(Number.call, Number).map((none, index) => {
                var url = "assets/" + (index + 1) + ".svg";
                return fetch(url).then(res => {
                    if (res.status != 200) throw Error("request failed")
                    return cache.put(url, res);
                });
            }))
        }).catch((err) => {
            console.log(err);
        }));
});
self.addEventListener("fetch", function (event) {
    event.respondWith(
        caches.match(event.request).then(function (res) {
            if (res) {
                return res;
            }
            return fetch(event.request).then(function (res) {
                return res;
            }).catch(function (err) {
                console.log(err);
            });
        }));
});