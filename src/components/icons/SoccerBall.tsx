import React from 'react';

interface SoccerBallProps {
  className?: string;
}

const SoccerBall: React.FC<SoccerBallProps> = ({ className = "w-5 h-5" }) => {
  return (
    <svg 
      className={className}
      viewBox="0 0 64 64"
      fill="currentColor"
    >
      <g>
        <path d="M32,10c-12.1,0-22,9.9-22,22s9.9,22,22,22,22-9.9,22-22-9.9-22-22-22ZM49.5,41.7l-8,1.2-3.3-4.1,2.7-9,4.9-1.6,6.1,6.1c-.3,2.7-1.1,5.2-2.4,7.5ZM22.6,42.9l-8-1.2c-1.3-2.3-2.1-4.8-2.4-7.5l6.1-6.1,4.9,1.6,2.7,9s-3.3,4.1-3.3,4.1ZM46.5,18.3l-1.4,7.9-5,1.7-7.1-4.5v-5.8l7.3-3.8c2.4,1.1,4.5,2.6,6.2,4.5ZM23.7,13.8l7.3,3.8v5.8l-7.1,4.5-5-1.7-1.4-7.9c1.8-1.9,3.9-3.4,6.2-4.5ZM28,51.6l-3.8-7.5,3.3-4.1h9l3.3,4.1-3.8,7.5c-1.3.3-2.6.4-4,.4s-2.7-.1-4-.4h0Z"/>
      </g>
    </svg>
  );
};

export default SoccerBall;