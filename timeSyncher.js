
function TimeSyncher(sendSyncRequest, onTimeout,
    onSyncStatusChanged) {

    var SYNC_REQUESTS = 10;
    var MIN_SUCCESSFUL_REQUESTS = 3;
    var SYNC_INTERVAL = 10000;
    var MAX_TIME_AGE = 4 * 60000;

    var synched = false;
    var syncInProcess = false;
    var syncRequestTime = null;
    var timeoutCancellationToken = null;
    var requestedSyncCount = SYNC_REQUESTS;

    var syncResponses = [];

    function onSyncTimeout() {
        syncInProcess = false;
        onTimeout();
    }

    function send() {
        syncRequestTime = performance.now();
        timeoutCancellationToken = setTimeout(onSyncTimeout,
            1000);
        if (!(sendSyncRequest())) {
            console.log("sendSyncRequest was not successful");
            clearTimeout(timeoutCancellationToken);
            timeoutCancellationToken = null;
            syncInProcess = false;
        }
    }

    function updateSynchedStatus() {
        var before = synched;
        synched = syncResponses.filter(function (r) {
            return !r.invalid;
        }).length >= MIN_SUCCESSFUL_REQUESTS;
        if (before != synched) {
            onSyncStatusChanged(synched);
        }
    }

    this.setUnsynchronized = function () {
        if (!syncInProcess) {
            syncInProcess = true;
            requestedSyncCount = SYNC_REQUESTS;
            send();
        }
        syncResponses.forEach(function (e) {
            e.invalid = true;
        });
        onSyncStatusChanged();
    }

    function validCount() {
        var expiredCount = syncResponses.filter(function (r) {
            return r.invalid || (performance.now() - r.responseTime) >= MAX_TIME_AGE;
        }).length;
        return syncResponses.length - expiredCount;
    }

    function timedSync() {
        if (!syncInProcess && validCount() < SYNC_REQUESTS) {
            syncInProcess = true;
            requestedSyncCount = SYNC_REQUESTS;
            send();
        }
    }

    setInterval(timedSync, SYNC_INTERVAL);

    this.abortSync = function () {
        if (null != timeoutCancellationToken) {
            clearTimeout(timeoutCancellationToken);
            timeoutCancellationToken = null;
        }
        syncInProcess = false;
    }

    this.addSyncResponse = function (serverTime, messageTime) {
        if (null != timeoutCancellationToken) {
            clearTimeout(timeoutCancellationToken);
            timeoutCancellationToken = null;
        }
        if (syncInProcess) {
            syncResponses.push({
                requestTime: syncRequestTime,
                serverTime: serverTime,
                responseTime: messageTime,
                delay: messageTime - syncRequestTime,
                invalid: false
            });
            updateSynchedStatus();
            var valid = validCount();
            if (valid < requestedSyncCount) {
                send();
            } else {
                syncInProcess = false;
            }
            if (valid > MIN_SUCCESSFUL_REQUESTS) {
                syncResponses = syncResponses.filter(function (r) {
                    return !r.invalid || (performance.now() - r.responseTime) < MAX_TIME_AGE;
                });
            }
        }
    }

    this.getAdjustedServerTime = function () {
        var delays = syncResponses
            .filter(function (r) {
                return !r.invalid;
            }).map(function (r) {
                return {
                    delay: r.delay,
                    serverTime: r.serverTime,
                    responseTime: r.responseTime
                };
            });
        if (delays.length) {
            delays.sort(function (a, b) {
                return a.delay - b.delay;
            });
            return delays[0].serverTime + (delays[0].delay / 2) + performance.now() - delays[0].responseTime;
        }
        return null;
    }
}