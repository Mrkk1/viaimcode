'use client';

import { useEffect, useRef } from 'react';

interface Pixel {
  x: number;
  y: number;
  size: number;
  opacity: number;
  lifespan: number;
  currentLife: number;
}

const PixelAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置canvas尺寸为全屏
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // 初始化canvas尺寸
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 禁用抗锯齿以确保像素边缘锐利
    ctx.imageSmoothingEnabled = false;

    // 创建新的像素点
    const createPixel = (): Pixel => ({
      x: Math.floor(Math.random() * canvas.width), // 使用整数位置
      y: Math.floor(Math.random() * canvas.height), // 使用整数位置
      size: Math.floor(Math.random() * 4) + 3, // 3-6像素大小，使用整数
      opacity: Math.random() * 0.9 + 0.1, // 0.1-1.0的透明度
      lifespan: Math.random() * 200 + 100, // 100-300帧的生命周期
      currentLife: 0,
    });

    // 动画循环
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 更新现有像素点
      pixelsRef.current = pixelsRef.current.filter(pixel => {
        pixel.currentLife++;
        
        // 计算淡入淡出的透明度
        let fadeOpacity = pixel.opacity;
        if (pixel.currentLife < 20) { // 淡入
          fadeOpacity = (pixel.currentLife / 20) * pixel.opacity;
        } else if (pixel.currentLife > pixel.lifespan - 20) { // 淡出
          fadeOpacity = ((pixel.lifespan - pixel.currentLife) / 20) * pixel.opacity;
        }

        // 绘制像素点
        ctx.fillStyle = `rgba(0, 255, 255, ${fadeOpacity})`; // 青色像素点
        ctx.fillRect(
          Math.floor(pixel.x), // 确保位置是整数
          Math.floor(pixel.y), // 确保位置是整数
          pixel.size,
          pixel.size
        );

        return pixel.currentLife < pixel.lifespan;
      });

      // 随机添加新的像素点
      if (Math.random() < 0.3 && pixelsRef.current.length < 20) { // 30%的概率添加新像素，最多20个
        pixelsRef.current.push(createPixel());
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // 开始动画
    animate();

    // 清理函数
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ 
        background: 'transparent',
        imageRendering: 'pixelated' // 确保像素渲染清晰
      }}
    />
  );
};

export default PixelAnimation; 