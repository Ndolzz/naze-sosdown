import { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export function Card({ children, padded = true, className, ...rest }: CardProps) {
  return (
    <div
      className={`${styles.card} ${padded ? styles.padded : ""} ${className ?? ""}`}
      {...rest}
    >
      {children}
    </div>
  );
}
