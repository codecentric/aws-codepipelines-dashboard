/**
 * @function AjaxSequencer
 * 
 * @description Execute Ajax requests in sequence, allowing no more than `limit` to be simultaneously in-flight.
 * @param {*} $             - instance of jQuery
 * @param {number} limit    - maximum number of simultaneous Ajax calls. Default is 3.
 *
 * @methods
 *  .get(url)   - enqueues $.get(url) and returns a promise for when it is done..
 *  .post(url)  - enqueues $.post(url) and returns a promise for when it is done.
 *  .clear()    - clears all queued requests, but allows in-flight requests to complete.
 */
let AjaxSequencer = function($, limit) {

    limit = limit || 3;     // Set default of 3.

    let active = 0;         // Number of currently active ajax requests (including queued requests).
    let pending = [];       // Queue of pending ajax requests.

    /**
     * @function enqueue_ajax
     * @description Create a deferred that, when resolved, fires the requested Ajax query, and returns a promise
     *              that resolves to the response to that query. Resolve it right away to start the request, if
     *              the number of in-flight requests is lower than `limit`. Otherwise, append it to a FIFO queue.
     *              Queue elements are popped off (and the corresponding request is started) when a request completes.
     * @param {@} pend 
     * @private
     */
    function enqueue_ajax(pend) {
        // This is the $.Deferred that is resolved when it is time to fire the query.
        pend.deferred = $.Deferred();
        
        // This promise is the one that is returned to the caller. It will return the results of the $.ajax query.
        let promise = pend.deferred.then(function() {
            // When this $.Deferred is resolved, it fires the requested query and returns the results.
            // Because this is a .then(), the results of the $.ajax() call are returned through promise.done().
            return $.ajax(pend.url, { method: pend.method });
        }).always(function() {
            // A query has completed. Decrement the number of `active` requests (which is the sum of `limit` plus pending).
            --active;
            pend = pending.shift();             // Pull a request from the front of the array (FIFO queue).
            if (pend) {
                // If we have a pending request, resolve it now, which will invoke pend.deferred.then(),
                // and will fire off the associated Ajax request.
                pend.deferred.resolve(); 
            }
        });

        if (active++ < limit) {
            // If we haven't reached `limit` yet, resolve this $.Deferred() immediately, so the query starts right away.
            pend.deferred.resolve();
        } else {
            // We've reached the `limit` so just queue this one up. It will fire when its turn comes in .always() above.
            pending.push(pend);
        }

        // Return the promise (with the results of the Ajax request) to the caller. If the `.then()` fails, this
        // entire promise will fail.
        return promise;
    }

    /**
     * @function get
     * @description - enqueue a GET request and return a promise.
     * @param {string} url
     */
    function get(url) {
        return enqueue_ajax({
            url: url,
            method: 'GET'
        });
    }

    /**
     * @function post
     * @description - enqueue a POST request.
     * @param {string} url
     */
    function post(url) {
        return enqueue_ajax({
            url: url,
            method: 'POST'
        });
    }

    /**
     * @function clear
     * @description - clear the queue of pending ajax requests.
     */
    function clear() {
        active -= pending.length;
        pending = [];
    }

    // Expose clear(), get() and post().
    return {
        clear: clear,
        get: get,
        post: post
    }
}
