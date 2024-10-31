"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Music } from "lucide-react";

interface LogoProps {
  className?: string;
}

const Logo = ({ className = "text-8xl" }: LogoProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [colors, setColors] = useState<string[]>([]);

  const generateRandomColors = () => {
    const colorOptions = [
      "text-red-500",
      "text-blue-500",
      "text-green-500",
      "text-yellow-500",
      "text-purple-500",
      "text-pink-500",
      "text-indigo-500",
      "text-orange-500",
      "text-teal-500",
    ];
    const shuffled = [...colorOptions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  };

  useEffect(() => {
    setIsAnimating(true);
  }, []);

  useEffect(() => {
    if (isAnimating) {
      setColors(generateRandomColors());
    }
  }, [isAnimating]);

  const handleClick = () => {
    if (!isAnimating) {
      setIsAnimating(true);
    }
  };

  return (
    <div className={`inline-flex items-center ${className} relative`}>
      <span>d</span>
      <motion.div
        className="relative mx-[-0.05em] min-w-[0.4em] cursor-pointer"
        animate={
          isAnimating
            ? {
                rotateY: [0, 80, 80, 0],
              }
            : undefined
        }
        transition={{
          duration: 3,
          times: [0, 0.2, 0.8, 1],
          ease: "easeInOut",
        }}
        style={{
          transformOrigin: "left",
        }}
        onClick={handleClick}
        onAnimationComplete={() => setIsAnimating(false)}
      >
        <motion.div className="w-[0.1em] h-[0.1em] rounded-full bg-current inline-block absolute right-[0.05em]" />
      </motion.div>
      <span>hr</span>
      {isAnimating && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0, 0], y: [-10, -20, -25, -30] }}
            transition={{ duration: 3, times: [0, 0.3, 0.7, 1], delay: 1 }}
            className={`absolute top-0 left-1/2 -translate-x-1/2 ${colors[0]}`}
          >
            <Music className="w-4 h-4" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0, 0], y: [-5, -15, -20, -25] }}
            transition={{ duration: 3, times: [0, 0.3, 0.7, 1], delay: 1.2 }}
            className={`absolute top-0 left-1/3 -translate-x-1/2 ${colors[1]}`}
          >
            <Music className="w-3 h-3" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0, 0], y: [-8, -18, -23, -28] }}
            transition={{ duration: 3, times: [0, 0.3, 0.7, 1], delay: 1.4 }}
            className={`absolute top-0 left-2/3 -translate-x-1/2 ${colors[2]}`}
          >
            <Music className="w-3.5 h-3.5" />
          </motion.div>
        </>
      )}
    </div>
  );
};

export default Logo;
