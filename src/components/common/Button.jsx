import React from 'react';
import { FiLoader } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const Button = ({
  children,
  variant = 'primary', // primary, secondary, danger, outline, outline-danger, ghost
  size = 'md', // sm, md, lg
  icon: Icon,
  loading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  const variantClasses = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 focus:ring-primary-500",
    secondary: "bg-earth-100 text-earth-800 hover:bg-earth-200 border border-earth-300 focus:ring-earth-400",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 focus:ring-red-500",
    outline: "bg-transparent border-2 border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white focus:ring-primary-500",
    "outline-danger": "bg-transparent border-2 border-red-500 text-red-600 hover:bg-red-50 focus:ring-red-500",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-200"
  };

  const disabledClasses = disabled || loading ? "opacity-60 cursor-not-allowed hover:transform-none hover:shadow-none" : "";

  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabledClasses} ${className}`;

  const renderContent = () => (
    <>
      {loading ? (
        <FiLoader className={`animate-spin ${children ? 'mr-2' : ''}`} />
      ) : Icon ? (
        <Icon className={`${children ? 'mr-2' : ''} ${size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg'}`} />
      ) : null}
      {children}
    </>
  );

  if (props.to) {
    return (
      <Link
        className={classes}
        onClick={(e) => {
          if (disabled || loading) {
            e.preventDefault();
          } else if (onClick) {
            onClick(e);
          }
        }}
        {...props}
      >
        {renderContent()}
      </Link>
    );
  }

  if (props.href) {
    return (
      <a
        className={classes}
        onClick={(e) => {
          if (disabled || loading) {
            e.preventDefault();
          } else if (onClick) {
            onClick(e);
          }
        }}
        {...props}
      >
        {renderContent()}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {renderContent()}
    </button>
  );
};

export default Button;
