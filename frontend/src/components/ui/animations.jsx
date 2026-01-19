import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

// Page transition wrapper
export const PageTransition = ({ children, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Staggered list container
export const StaggerContainer = ({ children, className = '', delay = 0 }) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delayChildren: delay,
            staggerChildren: 0.08,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Staggered list item
export const StaggerItem = ({ children, className = '' }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Hover card with lift effect and glow
export const HoverCard = ({ children, className = '', glowColor = 'blue' }) => {
  const glowColors = {
    blue: 'rgba(37, 99, 235, 0.2)',
    purple: 'rgba(139, 92, 246, 0.2)',
    orange: 'rgba(249, 115, 22, 0.2)',
    green: 'rgba(16, 185, 129, 0.2)',
  };

  return (
    <motion.div
      whileHover={{
        y: -6,
        scale: 1.01,
        boxShadow: `0 25px 50px -12px ${glowColors[glowColor]}`,
      }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`cursor-pointer ${className}`}
    >
      {children}
    </motion.div>
  );
};

// Interactive card with expand on hover
export const ExpandableCard = ({ 
  children, 
  expandedContent, 
  className = '',
  expandedClassName = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
      <AnimatePresence>
        {isHovered && expandedContent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={expandedClassName}
          >
            {expandedContent}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Tooltip with animation
export const AnimatedTooltip = ({ children, content, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  const positionStyles = {
    top: { bottom: '100%', left: '50%', x: '-50%', mb: 2 },
    bottom: { top: '100%', left: '50%', x: '-50%', mt: 2 },
    left: { right: '100%', top: '50%', y: '-50%', mr: 2 },
    right: { left: '100%', top: '50%', y: '-50%', ml: 2 },
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg shadow-lg whitespace-nowrap"
            style={{
              [positionStyles[position].bottom ? 'bottom' : 'top']: positionStyles[position].bottom || positionStyles[position].top,
              [positionStyles[position].left ? 'left' : 'right']: positionStyles[position].left || positionStyles[position].right,
              transform: `translate(${positionStyles[position].x || '0'}, ${positionStyles[position].y || '0'})`,
              marginBottom: positionStyles[position].mb ? `${positionStyles[position].mb * 4}px` : undefined,
              marginTop: positionStyles[position].mt ? `${positionStyles[position].mt * 4}px` : undefined,
            }}
          >
            {content}
            <div 
              className="absolute w-2 h-2 bg-slate-900 rotate-45"
              style={{
                ...(position === 'top' && { bottom: '-4px', left: '50%', marginLeft: '-4px' }),
                ...(position === 'bottom' && { top: '-4px', left: '50%', marginLeft: '-4px' }),
                ...(position === 'left' && { right: '-4px', top: '50%', marginTop: '-4px' }),
                ...(position === 'right' && { left: '-4px', top: '50%', marginTop: '-4px' }),
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Counter with animation
export const AnimatedCounter = ({ value, duration = 1, className = '' }) => {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {value}
    </motion.span>
  );
};

// Button with ripple effect
export const RippleButton = ({ children, onClick, className = '', ...props }) => {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = { x, y, id: Date.now() };
    setRipples([...ripples, newRipple]);
    
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
    
    onClick?.(e);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {children}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
          }}
        />
      ))}
    </motion.button>
  );
};

// Fade in when visible (intersection observer)
export const FadeInWhenVisible = ({ children, className = '', delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Animated progress bar
export const AnimatedProgress = ({ value, max = 100, className = '', barClassName = '' }) => {
  const percentage = (value / max) * 100;
  
  return (
    <div className={`relative h-2 bg-slate-200 rounded-full overflow-hidden ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`h-full rounded-full ${barClassName || 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
      />
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />
    </div>
  );
};

// Animated badge with pulse
export const PulseBadge = ({ children, className = '', pulseColor = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  };

  return (
    <span className={`relative inline-flex ${className}`}>
      {children}
      <motion.span
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
        }}
        className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${colors[pulseColor]}`}
      />
      <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${colors[pulseColor]}`} />
    </span>
  );
};

// Skeleton loader with shimmer
export const SkeletonLoader = ({ className = '', variant = 'text' }) => {
  const variants = {
    text: 'h-4 rounded',
    title: 'h-6 rounded w-3/4',
    avatar: 'w-12 h-12 rounded-full',
    card: 'h-32 rounded-xl',
    button: 'h-10 w-24 rounded-lg',
  };

  return (
    <div className={`relative overflow-hidden bg-slate-200 ${variants[variant]} ${className}`}>
      <motion.div
        animate={{ x: ['0%', '100%'] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
        style={{ width: '50%' }}
      />
    </div>
  );
};

// Floating action button
export const FloatingButton = ({ children, onClick, className = '' }) => {
  return (
    <motion.button
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      onClick={onClick}
      className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-50 ${className}`}
    >
      {children}
    </motion.button>
  );
};

export default {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  HoverCard,
  ExpandableCard,
  AnimatedTooltip,
  AnimatedCounter,
  RippleButton,
  FadeInWhenVisible,
  AnimatedProgress,
  PulseBadge,
  SkeletonLoader,
  FloatingButton,
};
