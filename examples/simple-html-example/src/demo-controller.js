window.demoController = (function(){
    let rtcConnectionHandler;
    let errorOccurred = false;
    let config = {};
    let started = false;
    let notConnectedMsg = "Not connected";
    let configCallback;
    let isDisconnecting = false; // Add flag to prevent recursive calls
    let videoIsReady = false; // Track when video is actually ready to play
    let animationRestarted = false; // Track if animation was restarted for this connection

    function init(callback) {
        configCallback = callback;
        updateButton();
        updateLoadingSpinner();
        updatePlayOverlay();
        document
            .getElementById("connect-disconnect-btn")
            .addEventListener("click", handleConnectDisconnect);
    }

    function updateButton() {
        const btn = document.getElementById("connect-disconnect-btn");
        btn.innerText = started ? "STOP LIVE DEMO" : "START LIVE DEMO";
    }

    function updatePlayOverlay() {
        const overlay = document.getElementById("play-overlay");
        const spinner = document.getElementById("loading-spinner");
        if (!overlay) {
            return;
        }
        try {
            const video = document.getElementById("remote-video");
            const hasVideoTracks = video && video.srcObject && video.srcObject.getTracks().length > 0;
            const isSpinnerVisible = spinner && !spinner.classList.contains("hidden");
            
            // Hide overlay if video is playing OR if spinner is showing
            if ((started && !errorOccurred && hasVideoTracks) || isSpinnerVisible) {
                overlay.classList.add("hidden");
            } else {
                overlay.classList.remove("hidden");
            }
        } catch (error) {
            overlay.classList.remove("hidden");
        }
    }

    function updateLoadingSpinner() {
        const spinner = document.getElementById("loading-spinner");
        if (!spinner) {
            return;
        }
        
        // Show spinner when connecting but video is not ready yet
        if (started && !errorOccurred && !videoIsReady) {
            spinner.classList.remove("hidden");
            // Force Safari to restart animation once per connection
            if (!animationRestarted) {
                const spinnerDiv = spinner.querySelector('.spinner');
                if (spinnerDiv) {
                    setTimeout(() => {
                        spinnerDiv.style.animation = 'none';
                        setTimeout(() => {
                            spinnerDiv.style.animation = 'spin 1s linear infinite';
                        }, 10);
                    }, 10);
                }
                animationRestarted = true;
            }
        } else {
            spinner.classList.add("hidden");
        }
    }

    function disconnect() {
        if (isDisconnecting) {
            return;
        }
        isDisconnecting = true;
        if (rtcConnectionHandler) {
            rtcConnectionHandler.close();
            rtcConnectionHandler = undefined;
        }
        document.getElementById("remote-video").srcObject = null;
        started = false;
        videoIsReady = false;
        animationRestarted = false;
        try {
            if (!errorOccurred) {
                updateSignalingStatus(notConnectedMsg);
            }
        } catch (error) {
            // Silently handle missing DOM elements on WordPress
        }
        errorOccurred = false;
        try {
            updatePeerConnectionStatus(notConnectedMsg);
            updateConnectionTypeStatus("Unknown");
        } catch (error) {
            // Silently handle missing DOM elements on WordPress
        }
        updateButton();
        updateLoadingSpinner();
        updatePlayOverlay();
        isDisconnecting = false;
    }

    async function connect() {
        errorOccurred = false;
        started = true;
        videoIsReady = false;
        animationRestarted = false;
        updateButton();
        updateLoadingSpinner();
        updatePlayOverlay();
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
                
                // Listen for when video is actually ready to play
                video.addEventListener('loadeddata', function onVideoReady() {
                    videoIsReady = true;
                    updateLoadingSpinner();
                    updatePlayOverlay();
                    video.removeEventListener('loadeddata', onVideoReady);
                }, { once: true });
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
                // Only update UI if not in the middle of disconnecting
                if (!isDisconnecting) {
                    updateButton();
                    updatePlayOverlay();
                    updateLoadingSpinner();
                }
            },
            onconnectiontypechange: type => {
                if (!errorOccurred) {
                    updateConnectionTypeStatus(type);
                }
                appendLog("Connection type: " + type);
            },
            onerror: error => {
                errorOccurred = true;
                updateSignalingStatus(error);
                updatePeerConnectionStatus(notConnectedMsg)
                updateConnectionTypeStatus("Unknown");
                appendLog(error);
                disconnect();
            }
        });
    }

    function handleConnectDisconnect() {
        started ? disconnect() : connect();
    }

    function handlePlayOverlayClick() {
        if (!started) {
            connect();
        }
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

    function updateConnectionTypeStatus(input) {
        const el = document.getElementById("webrtc-status-value-connection-type");
        if (el) {
            el.innerText = formatStatusMessage(input);
        }
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

    return { init, handlePlayOverlayClick };
})();