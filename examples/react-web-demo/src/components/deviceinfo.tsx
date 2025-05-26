import { Paper, Table, TableBody, TableCell, TableContainer, TableRow } from "@mui/material";
import { Help, StylizedHelp } from "./help";

const helpSignalingServiceConnectionState =(
    <StylizedHelp title="Service Connection State">
        Indicates the state of our connection to the Nabto Signaling Service.
    </StylizedHelp>
);

type DeviceInfoTableProps = {
    signalingServiceState?: string,
    peerConnectionStates: { name: string, state: string }[]
};

export function DeviceInfoTable({ signalingServiceState, peerConnectionStates }: DeviceInfoTableProps) {
    return (
        <TableContainer component={Paper}>
            <Table size="small">
                <TableBody>
                    <TableRow>
                        <TableCell scope="row"><Help text={helpSignalingServiceConnectionState} size="small"><b>Signaling Service Connection State</b></Help></TableCell>
                        <TableCell align="right">{signalingServiceState?.toUpperCase() ?? "N/A"}</TableCell>
                    </TableRow>
                    {
                        peerConnectionStates.map((peer, index) => (
                            <TableRow key={index}>
                                <TableCell scope="row"><Help text="RTC connection state to peer" size="small"><b>Peer {peer.name} connection state</b></Help></TableCell>
                                <TableCell align="right">{peer.state.toUpperCase() ?? "N/A"}</TableCell>
                            </TableRow>
                        ))
                    }
                </TableBody>
            </Table>
        </TableContainer>
    )
}