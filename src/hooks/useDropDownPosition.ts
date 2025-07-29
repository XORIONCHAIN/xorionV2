// hooks/useDropdownPosition.ts
import { useState, useEffect, RefObject } from 'react';

export const useDropdownPosition = (
  anchorEl: RefObject<HTMLElement>,
  isOpen: boolean
) => {
  const [style, setStyle] = useState({ top: 0, left: 0, width: 320 });

  useEffect(() => {
    if (!isOpen || !anchorEl.current) return;

    const updatePosition = () => {
      const rect = anchorEl.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const dropdownWidth = 320;
      const dropdownHeight = 350; // A sensible default height

      let left = rect.left;
      let top = rect.bottom + window.scrollY + 8;

      // Adjust if it overflows the right edge
      if (left + dropdownWidth > viewportWidth) {
        left = rect.right - dropdownWidth;
      }
      if (left < 0) left = 8;

      // Adjust if it overflows the bottom edge by flipping it to the top
      if (rect.bottom + dropdownHeight > viewportHeight) {
        top = rect.top + window.scrollY - dropdownHeight - 8;
      }

      setStyle({
        top,
        left,
        width: dropdownWidth
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true); // Use capture to fire first

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, anchorEl]);

  return style;
};