import { HelpRounded } from "@mui/icons-material"
import { Stack, Tooltip, Typography } from "@mui/material"
import { Fragment, PropsWithChildren, ReactNode } from "react"

type HelpProps = {
    reverse?: boolean,
    size?: "small" | "medium" | "large",
    text?: ReactNode
};

export function StylizedHelp({ children, title }: PropsWithChildren<{title: string}>) {
    return (
        <Fragment>
            <Typography color="inherit">{title}</Typography>
            {children}
        </Fragment>
    );
}

export function HelpIcon({ size, title }: { size?: "small" | "medium" | "large", title: ReactNode}) {
    return (<Tooltip title={title} >
        <HelpRounded fontSize={size ?? "medium"} />
    </Tooltip>)
}

export function Help(props: PropsWithChildren<HelpProps>) {
    const size = props.size ?? "small";
    return (<Stack alignItems="center" direction="row" gap={1}>
        {props.reverse ? null : (<HelpIcon title={props.text ?? "unknown tooltip"} size={size} />)}
        {props.children}
        {props.reverse ? (<HelpIcon title={props.text ?? "unknown tooltip"} size={size} />) : null}
    </Stack>)
}