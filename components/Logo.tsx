import { motion } from "framer-motion";

interface LogoProps {
  className?: string;
}

const Logo = ({ className = "text-8xl" }: LogoProps) => {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <span>d</span>
      <motion.div
        className="relative mx-[-0.05em] min-w-[0.4em]"
        animate={{
          rotateY: [0, 80, 80, 0],
        }}
        transition={{
          duration: 2,
          times: [0, 0.2, 0.8, 1],
          repeat: 0,
          ease: "easeInOut",
        }}
        style={{
          transformOrigin: "left",
        }}
      >
        <motion.div className="w-[0.1em] h-[0.1em] rounded-full bg-current inline-block absolute right-[0.05em]" />
      </motion.div>
      <span>hr</span>
    </div>
  );
};

export default Logo;
