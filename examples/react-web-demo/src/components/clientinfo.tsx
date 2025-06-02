import { Paper, Table, TableBody, TableCell, TableContainer, TableRow } from "@mui/material";
import { Help, StylizedHelp } from "./help";

type ClientInfoTableProps = {
    rtcConnectionState?: string,
    rtcSignalingState?: string,
    signalingServiceState?: string,
    signalingPeerState?: string
};

const helpRtcConnectionState = (
    <StylizedHelp title="RTC Peer Connection State">
        <p>Indicates the current state of the WebRTC peer connection</p>
        (new, connecting, connected, disconnected, failed, closed)
    </StylizedHelp>
);

const helpRtcSignalingState =(
    <StylizedHelp title="RTC Peer Signaling State">
        <p>Indicates the state of the signaling process on this peer's end. This will generally be one of "stable", "have-local-offer" and "have-remote-offer".</p>
        <p>For example have-local-offer means that we have created and sent an offer to the device but we have not received an answer back yet.</p>
    </StylizedHelp>
);

const helpSignalingServiceConnectionState =(
    <StylizedHelp title="Service Connection State">
        Indicates the state of our connection to the Nabto Signaling Service.
    </StylizedHelp>
);

const helpSignalingServicePeerState =(
    <StylizedHelp title="Service Peer State">
        Indicates the state of our signaling connection to the device. This connection is primarily in charge of sending offers and answers back and forth.
    </StylizedHelp>
);

export function ClientInfoTable({ rtcConnectionState: connectionState, rtcSignalingState: signalingState, signalingServiceState, signalingPeerState }: ClientInfoTableProps) {
    return (
        <TableContainer component={Paper}>
            <Table size="small">
                <TableBody>
                    <TableRow>
                        <TableCell component="th" scope="row"><Help text={helpRtcConnectionState} size="small"><b>RTC Connection State</b></Help></TableCell>
                        <TableCell align="right">{connectionState?.toUpperCase() ?? "N/A"}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell component="th" scope="row"><Help text={helpRtcSignalingState} size="small"><b>RTC Signaling State</b></Help></TableCell>
                        <TableCell align="right">{signalingState?.toUpperCase() ?? "N/A"}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell component="th" scope="row"><Help text={helpSignalingServiceConnectionState} size="small"><b>Signaling Service Connection State</b></Help></TableCell>
                        <TableCell align="right">{signalingServiceState?.toUpperCase() ?? "N/A"}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell component="th" scope="row"><Help text={helpSignalingServicePeerState} size="small"><b>Signaling Service Peer State</b></Help></TableCell>
                        <TableCell align="right">{signalingPeerState?.toUpperCase() ?? "N/A"}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>
    )
}
