import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getCategoryColor = (category: string) => {
  const colors: { [key: string]: string } = {
    'intervallpass': '#BF5E42',
    'distanspass': '#468771',
    'långpass': '#7AA6DB',
    'styrka': '#4E7C8C',
    'tävling': '#000000',
  };
  return colors[category.toLowerCase()] || '#BF5E42';
};