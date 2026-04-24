import React, { useEffect, useRef } from "react";
import { BallConfig } from "../types";

interface BallPreviewProps {
  config: BallConfig;
  size?: number;
  rotate?: boolean;
}

export const BallPreview: React.FC<BallPreviewProps> = ({ 
  config, 
  size = 200, 
  rotate = true 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const angleRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const { 
        primaryColor, 
        lineColor, 
        glowColor, 
        material, 
        scale, 
        grooveThickness,
        showGlow,
        printText,
        printedNumber,
        reflectionIntensity,
        airLevel = 1,
        style
      } = config;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Air Level directly influences the radius
      const radius = (size / 2) * scale * airLevel;

      if (rotate) {
        angleRef.current += 0.02 * config.rotationSpeedMultiplier;
      }

      // 1. Glow Effect (Atmosphere)
      if (showGlow) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 20, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(centerX, centerY, radius, centerX, centerY, radius + 25);
        glow.addColorStop(0, glowColor + "44");
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fill();
        ctx.restore();
      }

      // 2. Main Ball Shadow (Beneath)
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Base Ball Circle Clip
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip();

      // 3D Sphere Gradient (The core depth)
      const baseGradient = ctx.createRadialGradient(
        centerX - radius * 0.4, 
        centerY - radius * 0.4, 
        radius * 0.05, 
        centerX, 
        centerY, 
        radius
      );

      if (material === 'lava') {
        baseGradient.addColorStop(0, "#ff7000");
        baseGradient.addColorStop(0.5, "#cc3300");
        baseGradient.addColorStop(1, "#330000");
      } else if (material === 'ice') {
        baseGradient.addColorStop(0, "#f0f9ff");
        baseGradient.addColorStop(0.5, "#93c5fd");
        baseGradient.addColorStop(1, "#1d4ed8");
      } else if (material === 'chrome') {
        baseGradient.addColorStop(0, "#f8fafc");
        baseGradient.addColorStop(0.4, "#cbd5e1");
        baseGradient.addColorStop(1, "#1e293b");
      } else if (material === 'metal') {
        baseGradient.addColorStop(0, "#ffeaa7");
        baseGradient.addColorStop(0.5, "#fab1a0");
        baseGradient.addColorStop(1, "#2d3436");
      } else {
        baseGradient.addColorStop(0, primaryColor);
        baseGradient.addColorStop(1, darkenColor(primaryColor, 60));
      }

      ctx.fillStyle = baseGradient;
      ctx.fill();

      // Ambient Occlusion / Sub-surface Rim Light
      const rim = ctx.createRadialGradient(centerX, centerY, radius * 0.85, centerX, centerY, radius);
      rim.addColorStop(0, "transparent");
      rim.addColorStop(1, "rgba(0,0,0,0.3)");
      ctx.fillStyle = rim;
      ctx.fill();

      // 4. Draw Grooves (Basketball Lines) - With 3D Wrap Logic
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = grooveThickness * scale;
      ctx.lineCap = "round";

      const lineAngle = angleRef.current;
      
      // Perspective wraps
      ctx.globalAlpha = 0.8;
      
      // Horizontal seam with spherical bowing
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius, Math.max(0, radius * Math.sin(lineAngle)), 0, 0, Math.PI * 2);
      ctx.stroke();

      // Vertical seam with spherical bowing
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, Math.max(0, radius * Math.cos(lineAngle)), radius, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Polar caps logic
      ctx.beginPath();
      const capScale = 0.8 + 0.1 * Math.sin(lineAngle);
      ctx.arc(centerX - radius * (1.2 * Math.cos(lineAngle*0.5)), centerY, radius * 1.1, -0.4, 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX + radius * (1.2 * Math.cos(lineAngle*0.5)), centerY, radius * 1.1, Math.PI - 0.4, Math.PI + 0.4);
      ctx.stroke();

      ctx.globalAlpha = 1.0;

      // 5. Details / Branding (Distorted by curve)
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      if (printText) {
        ctx.fillStyle = lineColor;
        ctx.shadowBlur = 2;
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.font = `black ${radius * 0.22}px sans-serif`;
        ctx.fillText(printText.toUpperCase(), centerX, centerY - radius * 0.35);
      }

      if (printedNumber) {
        ctx.fillStyle = lineColor;
        ctx.font = `900 ${radius * 0.55}px sans-serif`;
        ctx.fillText(printedNumber, centerX, centerY + radius * 0.15);
      }

      // Reset shadows
      ctx.shadowBlur = 0;

      // 6. Specular Highlight (The 3D Gloss)
      ctx.globalCompositeOperation = "screen";
      const highlight = ctx.createRadialGradient(
        centerX - radius * 0.35, 
        centerY - radius * 0.35, 
        0, 
        centerX - radius * 0.35, 
        centerY - radius * 0.35, 
        radius * 0.5
      );
      highlight.addColorStop(0, `rgba(255, 255, 255, ${reflectionIntensity * 0.9})`);
      highlight.addColorStop(0.4, `rgba(255, 255, 255, ${reflectionIntensity * 0.4})`);
      highlight.addColorStop(1, "transparent");
      ctx.fillStyle = highlight;
      ctx.fill();
      
      // Second Sharp Highlight
      const sharp = ctx.createRadialGradient(
        centerX - radius * 0.2, 
        centerY - radius * 0.2, 
        0, 
        centerX - radius * 0.2, 
        centerY - radius * 0.2, 
        radius * 0.1
      );
      sharp.addColorStop(0, `rgba(255, 255, 255, ${reflectionIntensity})`);
      sharp.addColorStop(1, "transparent");
      ctx.fillStyle = sharp;
      ctx.fill();

      ctx.restore();

      // Final Outer Sharp Edge
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationRef.current);
  }, [config, size, rotate]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size + 40, height: size + 40 }}>
      {/* Background Shadow */}
      <div className="absolute w-3/4 h-4 bg-black/40 blur-xl rounded-full bottom-2 scale-x-125 opacity-50"></div>
      
      <canvas 
        ref={canvasRef} 
        width={size + 40} 
        height={size + 40}
        className="relative z-10 drop-shadow-2xl"
      />
    </div>
  );
};

// Helper to darken a hex color
function darkenColor(hex: string, percent: number): string {
  if (!hex.startsWith('#')) return hex;
  const num = parseInt(hex.replace("#", ""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) - amt,
    G = (num >> 8 & 0x00FF) - amt,
    B = (num & 0x0000FF) - amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}
