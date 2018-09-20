/**
 * @component AjaxSequencer
 * @parameters
 *  $         - instance of jQuery
 *  limit     - maximum number of simultaneous Ajax calls. Default is 3.
 *
 * @description Execute Ajax requests in sequence, allowing no more than `limit` to be simultaneously in-flight.
 *
 * @methods
 *  .get(url, responseHandler)  - enqueues $.get(url). On complete, call `responseHandler` and start the next one.
 *  .post(url, responseHandler) - enqueues $.post(url). On complete, call `responseHandler` and start the next one.
 *  .clear()                    - clears all queued requests, but allows in-flight requests to complete.
 */
let AjaxSequencer = function($, limit) {

    limit = limit || 3;     // Set default of 3.

    let active = 0;         // Number of currently active ajax requests.
    let pending = [];       // Queue of pending ajax requests.

    function enqueue_ajax(pend) {
        if (active < limit) {
            // Under the limit. Start this request immediately.
            ++active;
            // Fire the request, and on success call the supplied responseHandler.
            // In all cases (even on error), start the next queued request.
            return $.ajax(pend.url, { method: pend.method }).done(function(response) {
                    console.log('ajax.done', pend.promise);
                    if (pend.promise) {
                        pend.promise.resolve(response);
                    }
                }).fail(function(response) {
                    console.log('ajax.fail', pend.promise);
                    if (pend.promise) {
                        pend.reject(response);
                    }
                }).always(function() {
                    // Request has finished. See if there is a subsequent one to start.
                    --active;
                    pend = pending.shift();       // Shift from the front of the array, so it forms a FIFO queue.
                    if (pend) {
                        enqueue_ajax(pend);
                    }
                });
        } else {
            // Too many active already. Push onto pending and wait for an active request to complete.
            pending.push(pend);               // Push onto the end of the array.
            pend.promise = $.Deferred();
            return pend.promise;
        }
    }

    /**
     * @title get
     * @description - enqueue a GET request.
     */
    function get(url) {
        return enqueue_ajax({
            url: url,
            method: 'GET'
        });
    }

    /**
     * @title post
     * @description - enqueue a POST request.
     */
    function post(url, responseHandler) {
        return enqueue_ajax({
            url: url,
            method: 'POST'
        });
    }

    /**
     * @title clear
     * @description - clear the queue of pending ajax requests.
     */
    function clear() {
      pending = [];
    }

    // Expose clear(), get() and post().
    return {
        clear: clear,
        get: get,
        post: post
    }
}
