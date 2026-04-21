import React, { useRef, useEffect } from 'react';

const ParticleBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    let particles = [];
    
    const mouse = {
      x: null,
      y: null,
      radius: 120
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };
    
    const handleMouseMove = (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };
    
    const handleMouseOut = () => {
      mouse.x = null;
      mouse.y = null;
    };

    const handleTouchMove = (event) => {
      if (event.touches.length > 0) {
        mouse.x = event.touches[0].clientX;
        mouse.y = event.touches[0].clientY;
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleMouseOut);

    class Particle {
      constructor(x, y, dx, dy, size) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.size = size;
        this.baseX = this.x;
        this.baseY = this.y;
        this.density = (Math.random() * 30) + 1;
      }
      
      draw() {
        ctx.fillStyle = 'rgba(212, 163, 115, 0.4)'; // Soft beige overlay color mapped to theme
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }
      
      update() {
        // Natural ambient drift
        this.baseX += this.dx;
        this.baseY += this.dy;

        // Boundary reflection
        if (this.baseX < 0 || this.baseX > canvas.width) this.dx = -this.dx;
        if (this.baseY < 0 || this.baseY > canvas.height) this.dy = -this.dy;

        // Interaction logic
        if (mouse.x !== null && mouse.y !== null) {
          let dx = mouse.x - this.x;
          let dy = mouse.y - this.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < mouse.radius) {
            let forceDirectionX = dx / distance;
            let forceDirectionY = dy / distance;
            let force = (mouse.radius - distance) / mouse.radius;
            let directionX = forceDirectionX * force * this.density;
            let directionY = forceDirectionY * force * this.density;
            
            this.x -= directionX;
            this.y -= directionY;
          } else {
            // Return to baseline
            if (this.x !== this.baseX) this.x -= (this.x - this.baseX) / 10;
            if (this.y !== this.baseY) this.y -= (this.y - this.baseY) / 10;
          }
        } else {
          // Return to baseline when no mouse
          if (this.x !== this.baseX) this.x -= (this.x - this.baseX) / 10;
          if (this.y !== this.baseY) this.y -= (this.y - this.baseY) / 10;
        }
        
        this.draw();
      }
    }

    const initParticles = () => {
      particles = [];
      const particleCount = Math.min((canvas.width * canvas.height) / 5000, 300); // Max 300 for performance
      for (let i = 0; i < particleCount; i++) {
        let size = (Math.random() * 2.5) + 0.5;
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        let dx = (Math.random() - 0.5) * 1.5; // Drift speed
        let dy = (Math.random() - 0.5) * 1.5;
        particles.push(new Particle(x, y, dx, dy, size));
      }
    };
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    handleResize();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
};

export default ParticleBackground;
