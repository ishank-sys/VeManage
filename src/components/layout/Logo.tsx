import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Logo component
 * Props:
 *  - showText: whether to render the VeManage wordmark (default true)
 *  - className: container class
 *  - collapsed: if true, forces icon-only variant
 */
export interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  showText?: boolean;
  collapsed?: boolean;
  size?: number; // height of icon (width auto)
}

export const Logo: React.FC<LogoProps> = ({
  showText = true,
  collapsed = false,
  size = 40,
  className,
  ...rest
}) => {
  const iconHeight = size;
  const iconWidth = (iconHeight / 54) * 42; // icon-only natural width
  const renderText = showText && !collapsed;

  const dark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  // Force logo to white for compact/dark header usage
  const gradientStart = "#ffffff";
  const gradientEnd = "#bddaffff";
  const accentFill = "#ffffff";
  const accentFillStrong = "#c1e1ffff";
  const highlight = "#ffffff";
  const wordColor = "#d0ebfeff";

  return (
    <div
      className={cn(
        "flex items-center select-none font-semibold tracking-wide drop-shadow-sm",
        collapsed ? "justify-center" : "gap-2",
        className
      )}
      {...rest}
    >
      {/* Compact icon (independent of wordmark) */}
      <svg
        viewBox="0 0 42 52"
        role="img"
        aria-label="VeManage Logo Icon"
        style={{ height: iconHeight, width: iconWidth }}
        className="shrink-0 overflow-visible"
      >
        <title>VeManage</title>
        <defs>
          <linearGradient id="vemanageLogoStroke" x1="0" x2="1">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
        </defs>
        <rect
          x="4"
          y="10"
          width="34"
          height="40"
          rx="4"
          ry="4"
          stroke="url(#vemanageLogoStroke)"
          strokeWidth="4"
          fill="none"
        />
        <rect
          x="14"
          y="4"
          width="14"
          height="10"
          rx="3"
          fill={accentFillStrong}
        />
        <circle cx="21" cy="9" r="2.5" fill={highlight} />
        <rect x="12" y="20" width="18" height="6" rx="1" fill={accentFill} />
        <rect
          x="18"
          y="30"
          width="12"
          height="6"
          rx="1"
          fill={accentFillStrong}
        />
        <path
          d="M10 42 L18 48 L34 20"
          fill="none"
          stroke={accentFill}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {renderText && (
        <span
          className="text-3xl font-semibold tracking-wide"
          style={{ color: wordColor }}
          aria-label="VeManage wordmark"
        >
          VeManage
        </span>
      )}
    </div>
  );
};

export default Logo;
