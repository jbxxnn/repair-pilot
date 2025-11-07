declare module "*.css";

// Shopify Web Components Type Definitions
declare namespace JSX {
  interface IntrinsicElements {
    "s-page": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      heading?: string;
    }, HTMLElement>;
    
    "s-box": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      padding?: "base" | "tight" | "loose" | "none";
      borderWidth?: "base" | "tight" | "loose" | "none";
      borderRadius?: "base" | "tight" | "loose" | "none";
      background?: "base" | "subdued" | "success-subdued" | "warning-subdued" | "info-subdued";
    }, HTMLElement>;
    
    "s-text": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      size?: "base" | "large" | "large-100";
    }, HTMLElement>;
    
    "s-button": React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement> & {
      variant?: "primary" | "secondary" | "tertiary" | "critical" | "auto";
      onClick?: (e: any) => void;
    }, HTMLButtonElement>;
    
    "s-spinner": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      size?: "base" | "large" | "large-100";
    }, HTMLElement>;
  }
}