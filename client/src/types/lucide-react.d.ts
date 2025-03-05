declare module 'lucide-react' {
  import { ComponentType, SVGAttributes } from 'react';
  
  export interface IconProps extends SVGAttributes<SVGElement> {
    color?: string;
    size?: string | number;
  }
  
  export type Icon = ComponentType<IconProps>;
  
  export const Loader2: Icon;
  export const CheckCircle: Icon;
  // Add other icons as needed
} 