
// inputs to pixel burst 
    // currently accepts text that must be a string
    // ex) <PixelBurst text={123} />
type PixelBurstProps = {
    text: string;
};

// export react component 
export function PixelBurst ({ text }: PixelBurstProps) {
    return <span>{text}</span>
}