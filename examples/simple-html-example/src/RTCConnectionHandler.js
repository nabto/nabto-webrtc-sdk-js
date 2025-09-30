class RTCConnectionHandler {
  /**
   * @param {Object} options - the options for the constructor
   * @param {string} options.productId - The product ID of the device we want to connect to
   * @param {string} options.deviceId - The device ID of the device we want to connect to
   * @param {string} options.sharedSecret - The shared secret of the device we want to connect to.
   * @param {(RTCTrackEvent) => void} options.ontrack - The handler to call when a track event occurs on the RTCPeerConnection
   * @param {(string | Error | unknown) => void} options.logger - The handler to call when logging a state change or error
   * @param {(Error) => void} options.onerror - The handler to call when a fatal error occurs
   */
  constructor({ productId, deviceId, sharedSecret, ontrack, onsignalingstatechange, onpeerconnectionstatechange, onconnectiontypechange, onerror }) {
    this.signalingClient = SDK.createSignalingClient({
      productId: productId,
      deviceId: deviceId,
      requireOnline: true,
      //endpointUrl: `https://${productId}.webrtc.dev.nabto.net`,
    });
    this.ontrack = ontrack;
    this.onsignalingstatechange = onsignalingstatechange;
    this.onpeerconnectionstatechange = onpeerconnectionstatechange;
    this.onconnectiontypechange = onconnectiontypechange;
    this.onerror = onerror;
    this.messageTransport = SDK.createClientMessageTransport(this.signalingClient, {
      securityMode: SDK.ClientMessageTransportSecurityMode.SHARED_SECRET,
      sharedSecret: sharedSecret,
      keyId: "default"
    })
    this.messageTransport.on("setupdone", async (iceServers) => {
      this.createPeerConnection(iceServers);
    })
    this.messageTransport.on("error", (error) => {
      this.onerror(error)
    })
    this.signalingClient.on("error", (error) => {
      this.onerror(error);
    })
    this.signalingClient.on("connectionstatechange", () => {
      console.log("Signaling connection state changed to: " + this.signalingClient.connectionState);
      this.onsignalingstatechange(this.signalingClient.connectionState)
    })
    this.signalingClient.start();
  }

  close() {
    this.signalingClient.close();
    if (this.pc) {
      this.pc.close()
    }
  }

  /**
   * Creating the peer connection. This has to be created after we have received
   * ice servers from the device/camera.
   *
   * @param {RTCIceServer[] | undefined} iceServers
   */
  async createPeerConnection(iceServers) {
    this.pc = new RTCPeerConnection({ iceServers: iceServers });
    this.perfectNegotiation = new SDK.PerfectNegotiation(this.pc, this.messageTransport);
    this.signalingEventHandler = new SDK.SignalingEventHandler(this.pc, this.signalingClient);
    this.pc.ontrack = (event) => {
      this.ontrack(event)
    }
    this.pc.onconnectionstatechange = () => {
      console.log("Peer connection state changed to: " + this.pc.connectionState);
      this.onpeerconnectionstatechange(this.pc.connectionState)
      if (this.pc.connectionState === 'connected') {
        this.checkConnectionType();
      }
    }
    this.pc.oniceconnectionstatechange = () => {
      if (this.pc.iceConnectionState === 'connected' || this.pc.iceConnectionState === 'completed') {
        this.checkConnectionType();
      }
    }
  }

  async checkConnectionType() {
    try {
      const stats = await this.pc.getStats();
      let connectionType = "Unknown";
      let selectedPair = null;
      
      // First, look for the transport stats to find the selected candidate pair
      for (let report of stats.values()) {
        if (report.type === 'transport') {
          selectedPair = stats.get(report.selectedCandidatePairId);
          break;
        }
      }
      
      // If no transport stats, fall back to nominated/selected candidate pair
      if (!selectedPair) {
        for (let report of stats.values()) {
          if (report.type === 'candidate-pair' && (report.nominated || report.selected)) {
            selectedPair = report;
            break;
          }
        }
      }
      
      // Final fallback to first succeeded pair
      if (!selectedPair) {
        for (let report of stats.values()) {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            selectedPair = report;
            break;
          }
        }
      }
      
      if (selectedPair) {
        const localCandidate = stats.get(selectedPair.localCandidateId);
        const remoteCandidate = stats.get(selectedPair.remoteCandidateId);
        
        if (localCandidate && remoteCandidate) {
          // Check if either candidate is a relay candidate
          if (localCandidate.candidateType === 'relay' || remoteCandidate.candidateType === 'relay') {
            connectionType = "Relay";
          } else {
            connectionType = "Direct P2P";
          }
        }
      }
      
      if (this.onconnectiontypechange) {
        this.onconnectiontypechange(connectionType);
      }
    } catch (error) {
      console.error("Error checking connection type:", error);
      if (this.onconnectiontypechange) {
        this.onconnectiontypechange("Unknown");
      }
    }
  }
}
