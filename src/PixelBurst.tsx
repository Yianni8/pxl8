import "./PixelBurst.css";

import { useEffect, useRef } from 'react';

const BLOCK_SIZE = 4;
const ANIMATION_DURATION_MS = 600;
const SHADE_INTERVALS_MS = 80;
const SHADE_PALETTE = [20, 75, 130, 185, 235];


// inputs to pixel burst 
    // currently accepts text that must be a string
    // ex) <PixelBurst text="Hello" />
type PixelBurstProps = {
    text: string;
};

type PixelBlock = {
    x: number; // horizontal starting point
    y: number; // vertical starting point
    alpha: number; // visibility of the block 
};

// exported react component 
export function PixelBurst ({ text }: PixelBurstProps) {

    const labelRef = useRef<HTMLSpanElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const blocksRef = useRef<PixelBlock[]>([]);
    const animationFrameRef = useRef<number | null>(null);
    const animationStartRef = useRef<number | null>(null);

    const animatedBlocks = (timestamp: number) => {
        // animation
        if(animationStartRef.current === null)
            animationStartRef.current = timestamp;

        const elapsed = timestamp - animationStartRef.current;

        // 0-79ms phase 0
        // 80-159ms phase 1 ...
        const phase = Math.floor( elapsed/SHADE_INTERVALS_MS, );

        // 0 = animation just started
        // 0.5 = halfway
        // 1 = animation done
        const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
        console.log({progress});

        const canvasElement = canvasRef.current;
        if (!canvasElement)
            return;

        const context = canvasElement.getContext("2d");
        if (!context)
            return;

        context.clearRect(
            0,
            0,
            canvasElement.width,
            canvasElement.height,
        );

        const opacity = 1 - progress;
        context.globalAlpha = opacity; 

        drawBlocks(
            context,
            blocksRef.current,
            BLOCK_SIZE,
            phase,
        );

        context.globalAlpha = 1;


        if(progress < 1) {
            animationFrameRef.current = requestAnimationFrame(animatedBlocks);
            return;
        }
        // when progress is at 1 then the animation is done. and animation refs will reset
        animationFrameRef.current = null;
        animationStartRef.current = null;
    };

    // only runs when called
    const showBlocks = () => {
        if (animationFrameRef.current !== null)
            cancelAnimationFrame(animationFrameRef.current);

        animationStartRef.current = null;

        animationFrameRef.current = requestAnimationFrame(animatedBlocks);
    };

    const hideBlocks = () => {
        if (animationFrameRef.current !== null) 
            cancelAnimationFrame(animationFrameRef.current);

        animationFrameRef.current = null;
        animationStartRef.current = null;
        const canvasElement = canvasRef.current;
        if (!canvasElement)
            return;

        const context = canvasElement.getContext("2d");
        if (!context)
            return;

        context.clearRect (
            0,
            0,
            canvasElement.width,
            canvasElement.height,
        );
    };

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

        let visiblePixelCount = 0;

        for (let alphaCount = 3; alphaCount < imageData.data.length; alphaCount += 4)
        {
            const alpha = imageData.data[alphaCount];

            if (alpha > 0)
                visiblePixelCount += 1;
        }

        context.clearRect(
            0, 
            0,
            canvasElement.width,
            canvasElement.height
        );

        const blocks: PixelBlock[] = []; // empty PixelBlocks array

        // Outer loop: number of blocks = (width / block size) X (height / block size)
        // Inner loop: pixels per block = block size * block size   
            // linear O(width x height)
            // becomes expensive when text, font, colour or size change (rescan each pixel on every change)
        for (let y = 0; y < imageData.height; y += BLOCK_SIZE)
        {
            for (let x = 0; x < imageData.width; x += BLOCK_SIZE)
            {
                const strongestAlpha = findStrongestAlpha(
                    imageData,
                    x,
                    y,
                    BLOCK_SIZE,
                );

                if (strongestAlpha === 0)
                    continue;

                blocks.push({
                    x,
                    y,
                    alpha: strongestAlpha,
                });

            }
        }
        blocksRef.current = blocks;
        
        console.log({ blocks });
    }, [text]);

    return (
        <span 
            className="pixel-burst"
            onMouseEnter={showBlocks}
            onMouseLeave={hideBlocks}
        >
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

// find the strongest alpha in a block
// finding the strongest alpha in a block to set the visibility based on the stronget alpha in that block
// rather than using the first visible or first pixel in the block
function findStrongestAlpha(
    imageData: ImageData,
    startX: number,
    startY: number,
    blockSize: number,
) {
    const endX = Math.min(
        startX + blockSize,
        imageData.width,
    );

    const endY = Math.min(
        startY + blockSize,
        imageData.height, 
    );

    let strongestA = 0;

    for (let y = startY; y < endY; y += 1)
    {
        for (let x = startX; x < endX; x += 1)
        {
            const pixIndex = (y * imageData.width + x) * 4;

            // pixIndex + 0 --> red
            // pixIndex + 1 --> green
            // pixIndex + 2 --> blue
            // pixIndex + 3 --> alpha (how visisble is this part)
            const alpha = imageData.data[pixIndex + 3];
            if(strongestA < alpha)
                strongestA = alpha;
        }
    }


    return strongestA;
}


// function to display the stored pixel blocks 
function drawBlocks(
    context: CanvasRenderingContext2D,
    blocks: PixelBlock[],
    blockSize: number,
    phase: number,
) {
    for (const block of blocks)
    {
        const col = Math.floor(block.x / blockSize);
        const row = Math.floor(block.y / blockSize);

        const rowOffset = row % 2;
        const shadeIndex = (col + phase + rowOffset) % SHADE_PALETTE.length;

        const shade = SHADE_PALETTE[shadeIndex];

        context.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${block.alpha / 255})`;

        context.fillRect(
            block.x,
            block.y,
            blockSize,
            blockSize,
        );
    }
}
