import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => {
  return (
    <img 
      src="/logo.svg" 
      alt="Presida.Club" 
      className={className}
    />
  );
};

export default Logo;