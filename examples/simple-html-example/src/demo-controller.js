window.demoController = (function(){
    let rtcConnectionHandler;
    let errorOccurred = false;
    let config = {};
    let started = false;
    let notConnectedMsg = "Not connected";
    let configCallback;

    function init(callback) {
        configCallback = callback;
        updateButton();
        document
            .getElementById("connect-disconnect-btn")
            .addEventListener("click", handleConnectDisconnect);
    }

    function updateButton() {
        const btn = document.getElementById("connect-disconnect-btn");
        btn.innerText = started ? "STOP LIVE DEMO" : "START LIVE DEMO";
    }

    function disconnect() {
        if (rtcConnectionHandler) {
            rtcConnectionHandler.close();
            rtcConnectionHandler = undefined;
        }
        document.getElementById("remote-video").srcObject = null;
        started = false;
        if (!errorOccurred) {
            updateSignalingStatus(notConnectedMsg);
        }
        errorOccurred = false;
        updatePeerConnectionStatus(notConnectedMsg);
        updateButton();
    }

    async function connect() {
        errorOccurred = false;
        started = true;
        updateButton();

        if (configCallback) {
            config = await configCallback();
        } else {
            console.error()
            return;
        }

        rtcConnectionHandler = new RTCConnectionHandler({
            productId: config.productId,
            deviceId: config.deviceId,
            sharedSecret: config.sharedSecret,
            ontrack: ({ track }) => {
                const video = document.getElementById("remote-video");
                if (!video.srcObject) video.srcObject = new MediaStream();
                video.srcObject.addTrack(track);
            },
            onsignalingstatechange: state => {
                if (!errorOccurred) {
                    updateSignalingStatus(state);
                }
                appendLog("Signaling state: " + state);
            },
            onpeerconnectionstatechange: state => {
                if (!errorOccurred) {
                  updatePeerConnectionStatus(state);
                }
                appendLog("PeerConnection state: " + state);
                updateButton();
            },
            onerror: error => {
                errorOccurred = true;
                updateSignalingStatus(error);
                updatePeerConnectionStatus(notConnectedMsg)
                appendLog(error);
                disconnect();
            }
        });
    }

    function handleConnectDisconnect() {
        started ? disconnect() : connect();
    }

    function formatStatusMessage(input) {
        let msg;
        if (input instanceof SDK.ProductIdNotFoundError) {
            msg = "The product id does not exists";
        } else if (input instanceof SDK.DeviceIdNotFoundError) {
            msg = "The device id does not exists";
        } else if (input instanceof SDK.DeviceOfflineError) {
            msg = "The device is not online, try again later"
        } else if (input instanceof SDK.SignalingError) {
            if (input.errorMessage) {
                msg = `${input.errorMessage} (${input.errorCode})`;
            } else {
                msg = `Signaling error (${input.errorCode})`;
            }
        } else if (input instanceof Error) {
            msg = input.message;
        } else if (typeof input === "string") {
            msg = input;
        } else {
            msg = JSON.stringify(input);
        }
        return msg.charAt(0).toUpperCase() + msg.slice(1).toLowerCase();
    }

    function updatePeerConnectionStatus(input) {
        const el = document.getElementById("webrtc-status-value-pc");
        el.innerText = formatStatusMessage(input);
    }

    function updateSignalingStatus(input) {
        const el = document.getElementById("webrtc-status-value-signaling");
        el.innerText = formatStatusMessage(input);
    }

    function appendLog(entry) {
        const logs = document.getElementById("logs");
        const line = entry instanceof Error
            ? entry.message
            : (typeof entry === "string" ? entry : JSON.stringify(entry));
        logs
            ? logs.innerText += line + "\n"
            : console.log(line);
    }

    return { init };
})();
