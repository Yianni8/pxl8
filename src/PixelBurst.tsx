import "./PixelBurst.css";

import { useEffect, useRef } from 'react';



// inputs to pixel burst 
    // currently accepts text that must be a string
    // ex) <PixelBurst text="Hello" />
type PixelBurstProps = {
    text: string;
};

// exported react component 
export function PixelBurst ({ text }: PixelBurstProps) {

    const labelRef = useRef<HTMLSpanElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const labelElement = labelRef.current;
        const canvasElement = canvasRef.current;

        if (!labelElement || !canvasElement)
            return;

        // measure the displayed text
        const labelRect = labelElement.getBoundingClientRect();

        // canvas w and h to measure the drawable pixels 
        canvasElement.width = Math.ceil(labelRect.width);
        canvasElement.height = Math.ceil(labelRect.height);

        // give canvas drawing tools 
        const context = canvasElement.getContext("2d");

        if (!context)
            return;

        const labelStyle = window.getComputedStyle(labelElement);

        context.font = labelStyle.font;
        context.textBaseline = "alphabetic";

        // measure the actual letter height 
            // calc the extra vertical space outside the label 
            // centres the letters in the space 
            // poistion the canvas baseline
        const textMetrics = context.measureText(text);
        const textHeight = 
            textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

        const topSpace = (canvasElement.height - textHeight) / 2;
        const baselineY = topSpace + textMetrics.actualBoundingBoxAscent;

        context.fillStyle = "rgba(0, 100, 255, 0.7)";
        context.fillText(text, 0, baselineY);

        const imageData = context.getImageData(
            0, 
            0,
            canvasElement.width,
            canvasElement.height,
        );

        // Start: x = 0, y = 0
        // Size: entire canvas width and height
        console.log({
            width: imageData.width,
            height: imageData.height,
            numberOfValues: imageData.data.length,
        });

        let visiblePixelCount = 0;

        for (let alphaCount = 3; alphaCount < imageData.data.length; alphaCount += 4)
        {
            const alpha = imageData.data[alphaCount];

            if (alpha > 0)
                visiblePixelCount += 1;
        }

        console.log({ visiblePixelCount });

        const blocksize = 4; // change to let user change this (size of the pixel)

        context.clearRect(
            0, 
            0,
            canvasElement.width,
            canvasElement.height
        );

        // Outer loop: number of blocks = (width / block size) X (height / block size)
        // Inner loop: pixels per block = block size * block size   
            // linear O(width x height)
            // becomes expensive when text, font, colour or size change (rescan each pixel on every change)
        for (let y = 0; y < imageData.height; y += blocksize)
        {
            for (let x = 0; x < imageData.width; x += blocksize)
            {
                const pixelI = (y * imageData.width + x) * 4;

                const r = imageData.data[pixelI];
                const g = imageData.data[pixelI + 1];
                const b = imageData.data[pixelI + 2];
                const a = imageData.data[pixelI + 3];

                if (a === 0)
                    continue;

                context.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
                context.fillRect(x, y, blocksize, blocksize);
            }
        }

    }, [text]);

    return (
        <span className="pixel-burst">
            <span ref={labelRef} className="pixel-burst__label">
                {text}
            </span>
            <canvas 
                ref={canvasRef}
                className="pixel-burst__canvas"
                aria-hidden="true"
            />
        </span>
    );
}