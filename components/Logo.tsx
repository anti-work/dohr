interface LogoProps {
  className?: string;
}

const Logo = ({ className = "text-8xl" }: LogoProps) => {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <span>d</span>
      <div className="relative mx-[-0.05em] min-w-[0.4em]">
        <div className="w-[0.1em] h-[0.1em] rounded-full bg-current inline-block absolute right-[0.05em]" />
      </div>
      <span>hr</span>
    </div>
  );
};

export default Logo;
