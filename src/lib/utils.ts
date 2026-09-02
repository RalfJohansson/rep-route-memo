import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getCategoryColor = (category: string) => {
  const colors: { [key: string]: string } = {
    'intervallpass': '#dd8862',
    'distanspass': '#6fa787',
    'långpass': '#7c93c4',
    'styrka': '#4f7c80',
    'tävling': '#35404d',
    'simning': '#e3b65a',
    'cykling': '#9A8cb0',
    'lopning': '#dd8862',
  };
  return colors[category.toLowerCase()] || '#dd8862';
};