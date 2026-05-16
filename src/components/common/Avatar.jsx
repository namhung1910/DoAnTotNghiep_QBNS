import React, { useState } from 'react';
import { getInitials } from '../../utils/format';

/**
 * Avatar Component
 * Displays user's avatar image or initials with a gradient background if no image exists.
 * 
 * @param {string} src - Image URL (optional)
 * @param {string} name - User's full name to extract initials from (fallback if no src)
 * @param {string} size - Size of the avatar ('sm', 'md', 'lg', 'xl')
 * @param {string} className - Additional CSS classes
 */
const Avatar = ({ src, name, size = 'md', className = '' }) => {
    const [imgError, setImgError] = useState(false);

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
    };

    const containerClasses = `rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${sizeClasses[size]} ${className}`;

    if (src && !imgError) {
        return (
            <div className={`${containerClasses} bg-gray-100`}>
                <img 
                    src={src} 
                    alt={name || 'Avatar'} 
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                />
            </div>
        );
    }

    return (
        <div className={`${containerClasses} bg-gradient-to-br from-primary-400 to-primary-600 text-white font-semibold`}>
            {getInitials(name)}
        </div>
    );
};

export default Avatar;
