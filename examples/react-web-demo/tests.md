# Testing
This file documents some tests that we will want to track to ensure that the web app works as expected. It is not yet clear how we can automate these tests, so for now they're checked manually.

* Connect new webcamera
    1. Start with no webcam/mic connected and "open video/audio stream" enabled
    2. Try starting a device
    3. See error occur
    4. Connect a webcam/mic
    5. Try starting a device and see it succeed

* Connect with no stream
    1. Start device with "open video/audio stream" disabled
    2. Connect with client and type over datachannel chat.

* Webcamera disconnect
    1. Start a device with a webcam
    2. Connect with a client
    3. Disconnect the webcam by pulling USB plug
    4. Ensure that the connection is still live through e.g. a datachannel chat.

* Repeated reconnection
    1. Start a device
    2. Connect with a client
    3. Disconnect with the same client and reconnect
    4. Repeat step 3 with N attempts, ensuring that all N reconnects are succesful

* Long wait
    1. Start a device
    2. Start a client on the phone and connect.
    3. Leave the phone for a while (e.g. half an hour) so that it will background processes and go into idle mode.
    4. Come back to the phone, ensure that the client either reconnects or gracefully exits.

* Device switch-up
    1. Start a device on computer A
    2. Connect with a client on computer B
    3. Disconnect device on computer A
    4. Start device with same ID on computer C
    5. Ensure that the client establishes a new connection with computer C or that the client exits gracefully.

## Connectivity tests

* Connectivity disconnect
    1. Start a device
    2. Connect a client, ensure the stream is visible
    3. Forcibly disconnect the device by e.g. closing the webapp
    4. Ensure that the connected client gracefully exits the connection and reports to the user that the connection died.

* Connectivity change (device)
    1. Start a device
    2. Start a client on a separate computer
    3. Disconnect and reconnect the device from internet
    4. Ensure that either the connection is re-established or the client exits gracefully

* Connectivity change (client)
    1. Start a device
    2. Start a client on a separate computer
    3. Disconnect and reconnect the client from internet
    4. Ensure that the client re-establishes a connection, or exits gracefully.

* Mobile connectivity change (device)
    1. Start a device on the phone (with react-native app)
    2. Start a client on a computer
    3. Disconnect wifi on the phone to switch to carrier network
    4. Ensure that the connection is re-established

* Mobile connectivity change (client)
    1. Start a device on a computer
    2. Connect with a phone client
    3. Disconnect wifi on the phone to switch to carrier network
    4. Ensure that the connection is re-established
