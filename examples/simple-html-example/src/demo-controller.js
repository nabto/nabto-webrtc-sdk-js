window.demoController = (function(){
    let rtcConnectionHandler;
    let errorOccurred = false;
    let config = {};
    let started = false;
    let notConnectedMsg = "Not connected";

    function init(settings) {
        config = settings;
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
        if (input && input.errorMessage && input.errorCode) {
            msg = `${input.errorMessage} (${input.errorCode})`;
        } else if (input instanceof Error) {
            msg = input.message;
        } else if (typeof input === "string") {
            msg = input;
        } else {
            msg = JSON.stringify(input);
        }
        if (/with id.* does not exist/.test(msg)) {
            msg = "Invalid product/device id";
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
