/**
 * The purpose of this utility is to timeout a Device connection which has
 * experienced inactivity. Inactivity is defined such that the signaling channel
 * has been open but there has not been a RTCPeerConnection in the `connected`
 * state for a certain amount of time. If that is the case the resource should
 * be freed.
 *
 * Algorithm: The timer is started if the RTCPeerConnection is not in the
 *   `connected` state. Whenever the RTCPeerConnection gets to the `connected`
 *   state the timer is cleared.
 *
 * Initially there is no RTCPeerConnection but the timer still runs such that
 * resources will not leak if the client forgets to send a proper initial
 * message.
 */
export class DeviceConnectionTimeout {
  timeoutId?: ReturnType<typeof setTimeout>;

  /**
   * Construct a new DeviceConnectionTimout object.
   *
   * @param timeoutMilliseconds The number of milliseconds to wait in the notConnected state.
   * @param timeoutCallback A callback which is invoked of the connection times out.
   */
  constructor(private timeoutMilliseconds: number, private timeoutCallback: () => void) {
    this.notConnected()
  }

  registerRTCPeerConnection(pc: RTCPeerConnection) {
    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "connected") {
        this.connected();
      } else {
        this.notConnected();
      }
    })
  }

  private clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  connected() {
    this.clearTimeout();
  }

  notConnected() {
    if (this.timeoutId) {
      // we already have an active timer do not reset it.
    } else {
      this.timeoutId = setTimeout(() => {
        this.timeoutCallback();
      }, this.timeoutMilliseconds)
    }
  }
  stop() {
    this.clearTimeout();
  }
}
