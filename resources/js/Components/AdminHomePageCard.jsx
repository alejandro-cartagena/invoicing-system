import React from 'react';

const Card = ({ imageUrl, imageAlt, title, description, className, onClick }) => {
  return (
    <div 
      className={`py-8 flex flex-col gap-4 w-[100%] max-w-[450px] rounded-lg overflow-hidden shadow-lg bg-white border-2 border-[var(--color-red)] hover:shadow-red-300 hover:scale-105 transition-all duration-300 ease-in-out cursor-pointer ${className || ''}`}
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="w-full overflow-hidden flex justify-center items-center">
        {typeof imageUrl === 'string' ? (
          <img 
            src={imageUrl} 
            alt={imageAlt}
            className="w-full h-full object-cover"
          />
        ) : (
          // If imageUrl is a React component (like FontAwesomeIcon)
          <div className="w-full">
            {imageUrl}
          </div>
        )}
      </div>
      
      {/* Text Content */}
      <div className="px-6">
        <h2 className="text-3xl font-semibold text-center text-[var(--color-black-text)] mb-2">
          {title}
        </h2>
        <p className="text-[var(--color-text)] text-base text-md text-center">
          {description}
        </p>
      </div>
    </div>
  );
};

export default Card;
