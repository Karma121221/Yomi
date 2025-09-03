import React, { useRef, useEffect, useMemo, useCallback } from 'react';

const ParticlesBg = ({
  color = "#FFF",
  quantity = 100,
  staticity = 50,
  ease = 50,
  className = "",
}) => {
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const contextRef = useRef(null);
  const circlesRef = useRef([]);
  
  // Mouse tracking - using refs for performance
  const mouseRef = useRef({ x: 0, y: 0 });
  const canvasSizeRef = useRef({ w: 0, h: 0 });
  const animationIdRef = useRef(null);

  // Device pixel ratio
  const pixelRatio = window.devicePixelRatio || 1;

  // Convert hex color to RGB values
  const colorRGB = useMemo(() => {
    // Remove the leading '#' if it's present
    let hex = color.replace(/^#/, "");

    // If the hex code is 3 characters, expand it to 6 characters
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }

    // Parse the r, g, b values from the hex string
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255; // Extract the red component
    const g = (bigint >> 8) & 255; // Extract the green component
    const b = bigint & 255; // Extract the blue component

    // Return the RGB values as a string separated by spaces
    return `${r} ${g} ${b}`;
  }, [color]);

  // Mouse move handler
  const handleMouseMove = useCallback((event) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const { w, h } = canvasSizeRef.current;
      const x = event.clientX - rect.left - w / 2;
      const y = event.clientY - rect.top - h / 2;

      const inside = x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2;
      if (inside) {
        mouseRef.current.x = x;
        mouseRef.current.y = y;
      }
    }
  }, []);

  // Create circle parameters
  const circleParams = useCallback(() => {
    const { w, h } = canvasSizeRef.current;
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h);
    const translateX = 0;
    const translateY = 0;
    const size = Math.floor(Math.random() * 2) + 1;
    const alpha = 0;
    const targetAlpha = parseFloat((Math.random() * 0.6 + 0.1).toFixed(1));
    const dx = (Math.random() - 0.5) * 0.2;
    const dy = (Math.random() - 0.5) * 0.2;
    const magnetism = 0.1 + Math.random() * 4;
    
    return {
      x,
      y,
      translateX,
      translateY,
      size,
      alpha,
      targetAlpha,
      dx,
      dy,
      magnetism,
    };
  }, []);

  // Draw circle
  const drawCircle = useCallback((circle, update = false) => {
    if (contextRef.current) {
      const { x, y, translateX, translateY, size, alpha } = circle;
      const ctx = contextRef.current;
      
      ctx.translate(translateX, translateY);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(${colorRGB.split(" ").join(", ")}, ${alpha})`;
      ctx.fill();
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      if (!update) {
        circlesRef.current.push(circle);
      }
    }
  }, [colorRGB, pixelRatio]);

  // Clear context
  const clearContext = useCallback(() => {
    if (contextRef.current) {
      const { w, h } = canvasSizeRef.current;
      contextRef.current.clearRect(0, 0, w, h);
    }
  }, []);

  // Draw particles
  const drawParticles = useCallback(() => {
    clearContext();
    circlesRef.current = [];
    const particleCount = quantity;
    for (let i = 0; i < particleCount; i++) {
      const circle = circleParams();
      drawCircle(circle);
    }
  }, [clearContext, quantity, circleParams, drawCircle]);

  // Resize canvas
  const resizeCanvas = useCallback(() => {
    if (canvasContainerRef.current && canvasRef.current && contextRef.current) {
      circlesRef.current = [];
      canvasSizeRef.current.w = canvasContainerRef.current.offsetWidth;
      canvasSizeRef.current.h = canvasContainerRef.current.offsetHeight;
      canvasRef.current.width = canvasSizeRef.current.w * pixelRatio;
      canvasRef.current.height = canvasSizeRef.current.h * pixelRatio;
      canvasRef.current.style.width = canvasSizeRef.current.w + "px";
      canvasRef.current.style.height = canvasSizeRef.current.h + "px";
      contextRef.current.scale(pixelRatio, pixelRatio);
    }
  }, [pixelRatio]);

  // Initialize canvas
  const initCanvas = useCallback(() => {
    resizeCanvas();
    drawParticles();
  }, [resizeCanvas, drawParticles]);

  // Remap value function
  const remapValue = useCallback((value, start1, end1, start2, end2) => {
    const remapped = ((value - start1) * (end2 - start2)) / (end1 - start1) + start2;
    return remapped > 0 ? remapped : 0;
  }, []);

  // Animation function
  const animate = useCallback(() => {
    clearContext();
    const { w, h } = canvasSizeRef.current;
    const mouse = mouseRef.current;

    circlesRef.current.forEach((circle, i) => {
      // Handle the alpha value
      const edge = [
        circle.x + circle.translateX - circle.size, // distance from left edge
        w - circle.x - circle.translateX - circle.size, // distance from right edge
        circle.y + circle.translateY - circle.size, // distance from top edge
        h - circle.y - circle.translateY - circle.size, // distance from bottom edge
      ];

      const closestEdge = edge.reduce((a, b) => Math.min(a, b));
      const remapClosestEdge = parseFloat(remapValue(closestEdge, 0, 20, 0, 1).toFixed(2));

      if (remapClosestEdge > 1) {
        circle.alpha += 0.02;
        if (circle.alpha > circle.targetAlpha) circle.alpha = circle.targetAlpha;
      } else {
        circle.alpha = circle.targetAlpha * remapClosestEdge;
      }

      circle.x += circle.dx;
      circle.y += circle.dy;
      circle.translateX +=
        (mouse.x / (staticity / circle.magnetism) - circle.translateX) / ease;
      circle.translateY +=
        (mouse.y / (staticity / circle.magnetism) - circle.translateY) / ease;

      // circle gets out of the canvas
      if (
        circle.x < -circle.size ||
        circle.x > w + circle.size ||
        circle.y < -circle.size ||
        circle.y > h + circle.size
      ) {
        // remove the circle from the array
        circlesRef.current.splice(i, 1);
        // create a new circle
        const newCircle = circleParams();
        drawCircle(newCircle);
      } else {
        drawCircle(
          {
            ...circle,
            x: circle.x,
            y: circle.y,
            translateX: circle.translateX,
            translateY: circle.translateY,
            alpha: circle.alpha,
          },
          true,
        );
      }
    });

    animationIdRef.current = window.requestAnimationFrame(animate);
  }, [clearContext, remapValue, staticity, ease, circleParams, drawCircle]);

  // Setup effect
  useEffect(() => {
    if (canvasRef.current) {
      contextRef.current = canvasRef.current.getContext("2d");
    }

    initCanvas();
    animate();

    // Add event listeners
    window.addEventListener("resize", initCanvas);
    window.addEventListener("mousemove", handleMouseMove);

    // Cleanup
    return () => {
      window.removeEventListener("resize", initCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationIdRef.current) {
        window.cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [initCanvas, animate, handleMouseMove]);

  return (
    <div
      ref={canvasContainerRef}
      className={className}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
};

export default ParticlesBg;
