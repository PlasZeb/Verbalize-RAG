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
      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)'; // Match bg color
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!isActive) {
        // Resting state
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(94, 234, 212, 0.3)';
        ctx.lineWidth = 2;
        ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
        ctx.stroke();
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 60;
      // dynamic radius based on volume
      const dynamicRadius = baseRadius + (volume * 200); 

      phase += 0.1;

      // Draw multiple rings
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const offset = i * (Math.PI / 3);
        const ringRadius = dynamicRadius + (Math.sin(phase + offset) * 10);
        
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        
        // Color gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#2dd4bf'); // Teal 400
        gradient.addColorStop(1, '#3b82f6'); // Blue 500
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3 - i;
        ctx.globalAlpha = 1 - (i * 0.2);
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
      className="w-full max-w-[400px] h-auto mx-auto"
    />
  );
};