import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  volume: number;
  isActive: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    
    const draw = () => {
      // Clear canvas with background color
      ctx.fillStyle = '#0f172a'; // Match bg-slate-950 roughly
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      if (!isActive) {
        // Resting state - subtle pulsing circle
        phase += 0.02;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(94, 234, 212, 0.2)';
        ctx.lineWidth = 2;
        const pulse = 40 + Math.sin(phase) * 5;
        ctx.arc(centerX, centerY, pulse, 0, Math.PI * 2);
        ctx.stroke();
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const baseRadius = canvas.width < 350 ? 40 : 60;
      const dynamicRadius = baseRadius + (volume * 150); 

      phase += 0.15;

      // Draw multiple rings
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const offset = i * (Math.PI / 3);
        const ringRadius = dynamicRadius + (Math.sin(phase + offset) * 12);
        
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        
        // Color gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#2dd4bf'); // Teal 400
        gradient.addColorStop(1, '#3b82f6'); // Blue 500
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4 - i;
        ctx.globalAlpha = 0.8 - (i * 0.2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [volume, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={400}
      className="w-full max-w-[300px] sm:max-w-[400px] h-auto aspect-square mx-auto"
    />
  );
};