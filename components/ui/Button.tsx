"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  icon,
  children,
  className,
  ...rest
}: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? styles.primary
      : variant === "secondary"
      ? styles.secondary
      : styles.ghost;

  return (
    <button className={`${styles.button} ${variantClass} ${className ?? ""}`} {...rest}>
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
