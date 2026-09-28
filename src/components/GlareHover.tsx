import type { CSSProperties, ReactNode } from "react";
import "./GlareHover.css";

type Props = { children: ReactNode; className?: string; style?: CSSProperties; glareColor?: string; glareOpacity?: number; glareAngle?: number; glareSize?: number; transitionDuration?: number; borderRadius?: string; background?: string; borderColor?: string };

export function GlareHover({ children, className = "", style, glareColor = "#dce9ff", glareOpacity = .12, glareAngle = -32, glareSize = 290, transitionDuration = 550, borderRadius = "10px", background = "#101a31", borderColor = "#2a3c61" }: Props) {
  const hex = glareColor.replace("#", "");
  const rgb = /^[0-9A-Fa-f]{6}$/.test(hex) ? `${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)}` : "220, 233, 255";
  const variables = { "--gh-bg": background, "--gh-br": borderRadius, "--gh-angle": `${glareAngle}deg`, "--gh-duration": `${transitionDuration}ms`, "--gh-size": `${glareSize}%`, "--gh-rgba": `rgba(${rgb}, ${glareOpacity})`, "--gh-border": borderColor } as CSSProperties;
  return <div className={`glare-hover ${className}`} style={{ ...variables, ...style }}>{children}</div>;
}
