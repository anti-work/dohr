"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface LogoProps {
  className?: string;
}

const Logo = ({ className = "text-8xl" }: LogoProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (!isAnimating) {
      setIsAnimating(true);
    }
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
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
    </div>
  );
};

export default Logo;
