"use client";
import { createRef, useEffect } from "react";
import { drawContributions } from "github-contributions-canvas";

export default function Contributions(props: {
    username: string;
    contributions: any;
}) {
    let canvasDOM = createRef<HTMLCanvasElement>();

    useEffect(() => {
            drawContributions(canvasDOM.current, {
                data: props.contributions,
                themeName: "githubDark",
                username: props.username,
            });
    }, [props.username]);

    return <canvas className="max-w-full min-h-full" ref={canvasDOM} />;
}
