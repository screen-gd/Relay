import React, {
  type CSSProperties,
  useEffect,
  useRef,
  useState,
  useMemo,
  type PropsWithChildren,
} from "react";

type GradualBlurProps = PropsWithChildren<{
  position?: "top" | "bottom" | "left" | "right";
  strength?: number;
  height?: string;
  width?: string;
  divCount?: number;
  exponential?: boolean;
  zIndex?: number;
  animated?: boolean | "scroll";
  duration?: string;
  easing?: string;
  opacity?: number;
  curve?: "linear" | "bezier" | "ease-in" | "ease-out" | "ease-in-out";
  responsive?: boolean;
  mobileHeight?: string;
  tabletHeight?: string;
  desktopHeight?: string;
  mobileWidth?: string;
  tabletWidth?: string;
  desktopWidth?: string;
  preset?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "subtle"
    | "intense"
    | "smooth"
    | "sharp"
    | "header"
    | "footer"
    | "sidebar"
    | "page-header"
    | "page-footer";
  hoverIntensity?: number;
  target?: "parent" | "page";
  onAnimationComplete?: () => void;
  className?: string;
  style?: CSSProperties;
}>;

type Position = NonNullable<GradualBlurProps["position"]>;
type Curve = NonNullable<GradualBlurProps["curve"]>;
type Preset = NonNullable<GradualBlurProps["preset"]>;
type ResponsiveDimension = "height" | "width";

type ResolvedConfig = {
  position: Position;
  strength: number;
  height: string;
  width?: string;
  divCount: number;
  exponential: boolean;
  zIndex: number;
  animated: boolean | "scroll";
  duration: string;
  easing: string;
  opacity: number;
  curve: Curve;
  responsive: boolean;
  target: "parent" | "page";
  className: string;
  style: CSSProperties;
  hoverIntensity?: number;
  onAnimationComplete?: () => void;
  mobileHeight?: string;
  tabletHeight?: string;
  desktopHeight?: string;
  mobileWidth?: string;
  tabletWidth?: string;
  desktopWidth?: string;
};

const DEFAULT_CONFIG: ResolvedConfig = {
  position: "bottom",
  strength: 2,
  height: "6rem",
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  animated: false,
  duration: "0.3s",
  easing: "ease-out",
  opacity: 1,
  curve: "linear",
  responsive: false,
  target: "parent",
  className: "",
  style: {},
};

const PRESETS: Record<Preset, Partial<GradualBlurProps>> = {
  top: { position: "top", height: "6rem" },
  bottom: { position: "bottom", height: "6rem" },
  left: { position: "left", height: "6rem" },
  right: { position: "right", height: "6rem" },
  subtle: { height: "4rem", strength: 1, opacity: 0.8, divCount: 3 },
  intense: { height: "10rem", strength: 4, divCount: 8, exponential: true },
  smooth: { height: "8rem", curve: "bezier", divCount: 10 },
  sharp: { height: "5rem", curve: "linear", divCount: 4 },
  header: { position: "top", height: "8rem", curve: "ease-out" },
  footer: { position: "bottom", height: "8rem", curve: "ease-out" },
  sidebar: { position: "left", height: "6rem", strength: 2.5 },
  "page-header": {
    position: "top",
    height: "10rem",
    target: "page",
    strength: 3,
  },
  "page-footer": {
    position: "bottom",
    height: "10rem",
    target: "page",
    strength: 3,
  },
};

const CURVE_FUNCTIONS: Record<Curve, (p: number) => number> = {
  linear: (p) => p,
  bezier: (p) => p * p * (3 - 2 * p),
  "ease-in": (p) => p * p,
  "ease-out": (p) => 1 - Math.pow(1 - p, 2),
  "ease-in-out": (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
};

const mergeConfigs = (
  ...configs: Partial<GradualBlurProps>[]
): ResolvedConfig =>
  configs.reduce<ResolvedConfig>(
    (merged, config) => ({ ...merged, ...config }),
    DEFAULT_CONFIG
  );

const getGradientDirection = (position: Position): string => {
  const directions: Record<Position, string> = {
    top: "to top",
    bottom: "to bottom",
    left: "to left",
    right: "to right",
  };
  return directions[position];
};

const debounce = (fn: () => void, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(fn, wait);
  };
};

const useResponsiveDimension = (
  responsive: boolean,
  config: ResolvedConfig,
  key: ResponsiveDimension
) => {
  const [value, setValue] = useState<string | undefined>(config[key]);
  useEffect(() => {
    if (!responsive) {
      setValue(config[key]);
      return;
    }
    const update = () => {
      const width = window.innerWidth;
      const responsiveValue =
        width <= 480
          ? key === "height"
            ? config.mobileHeight
            : config.mobileWidth
          : width <= 768
            ? key === "height"
              ? config.tabletHeight
              : config.tabletWidth
            : key === "height"
              ? config.desktopHeight
              : config.desktopWidth;
      setValue(responsiveValue ?? config[key]);
    };
    const debounced = debounce(update, 100);
    update();
    window.addEventListener("resize", debounced);
    return () => window.removeEventListener("resize", debounced);
  }, [config, key, responsive]);
  return responsive ? value : config[key];
};

const useIntersectionObserver = (
  ref: React.RefObject<HTMLDivElement | null>,
  shouldObserve: boolean
) => {
  const [isVisible, setIsVisible] = useState(!shouldObserve);

  useEffect(() => {
    if (!shouldObserve || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, shouldObserve]);

  return isVisible;
};

const GradualBlur: React.FC<GradualBlurProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const config = useMemo(
    () =>
      mergeConfigs(
        DEFAULT_CONFIG,
        props.preset ? PRESETS[props.preset] : {},
        props
      ),
    [props]
  );

  const responsiveHeight = useResponsiveDimension(
    config.responsive,
    config,
    "height"
  );
  const responsiveWidth = useResponsiveDimension(
    config.responsive,
    config,
    "width"
  );
  const isVisible = useIntersectionObserver(
    containerRef,
    config.animated === "scroll"
  );

  const blurDivs = useMemo(() => {
    const divs: React.ReactNode[] = [];
    const increment = 100 / config.divCount;
    const currentStrength =
      isHovered && config.hoverIntensity
        ? config.strength * config.hoverIntensity
        : config.strength;
    const curveFunc = CURVE_FUNCTIONS[config.curve];

    for (let i = 1; i <= config.divCount; i++) {
      let progress = i / config.divCount;
      progress = curveFunc(progress);

      const blurValue = config.exponential
        ? Number(Math.pow(2, progress * 4)) * 0.0625 * currentStrength
        : 0.0625 * (progress * config.divCount + 1) * currentStrength;
      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;

      const divStyle: CSSProperties = {
        maskImage: `linear-gradient(${getGradientDirection(config.position)}, ${gradient})`,
        WebkitMaskImage: `linear-gradient(${getGradientDirection(config.position)}, ${gradient})`,
        backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        opacity: config.opacity,
        transition:
          config.animated && config.animated !== "scroll"
            ? `backdrop-filter ${config.duration} ${config.easing}`
            : undefined,
      };
      divs.push(<div key={i} className="absolute inset-0" style={divStyle} />);
    }
    return divs;
  }, [config, isHovered]);

  const containerStyle: CSSProperties = useMemo(() => {
    const isVertical = ["top", "bottom"].includes(config.position);
    const isHorizontal = ["left", "right"].includes(config.position);
    const isPageTarget = config.target === "page";
    const baseStyle: CSSProperties = {
      position: isPageTarget ? "fixed" : "absolute",
      pointerEvents: config.hoverIntensity ? "auto" : "none",
      opacity: isVisible ? 1 : 0,
      transition: config.animated
        ? `opacity ${config.duration} ${config.easing}`
        : undefined,
      zIndex: isPageTarget ? config.zIndex + 100 : config.zIndex,
      ...config.style,
    };

    if (isVertical) {
      baseStyle.height = responsiveHeight;
      baseStyle.width = responsiveWidth || "100%";
      baseStyle[config.position] = 0;
      baseStyle.left = 0;
      baseStyle.right = 0;
    } else if (isHorizontal) {
      baseStyle.width = responsiveWidth || responsiveHeight;
      baseStyle.height = "100%";
      baseStyle[config.position] = 0;
      baseStyle.top = 0;
      baseStyle.bottom = 0;
    }
    return baseStyle;
  }, [config, responsiveHeight, responsiveWidth, isVisible]);

  useEffect(() => {
    if (
      isVisible &&
      config.animated === "scroll" &&
      config.onAnimationComplete
    ) {
      const timeout = setTimeout(
        config.onAnimationComplete,
        parseFloat(config.duration) * 1000
      );
      return () => clearTimeout(timeout);
    }
  }, [config, isVisible]);

  return (
    <div
      ref={containerRef}
      className={`gradual-blur relative isolate ${config.target === "page" ? "gradual-blur-page" : "gradual-blur-parent"} ${config.className}`}
      style={containerStyle}
      onMouseEnter={
        config.hoverIntensity ? () => setIsHovered(true) : undefined
      }
      onMouseLeave={
        config.hoverIntensity ? () => setIsHovered(false) : undefined
      }
    >
      <div className="relative w-full h-full">{blurDivs}</div>
      {props.children && <div className="relative">{props.children}</div>}
    </div>
  );
};

const GradualBlurMemo = React.memo(GradualBlur);
GradualBlurMemo.displayName = "GradualBlur";
export default GradualBlurMemo;

const injectStyles = () => {
  if (typeof document === "undefined") return;
  const id = "gradual-blur-styles";
  if (document.getElementById(id)) return;
  const element = document.createElement("style");
  element.id = id;
  element.textContent = `.gradual-blur{pointer-events:none;transition:opacity .3s ease-out}.gradual-blur-inner{pointer-events:none}`;
  document.head.appendChild(element);
};
if (typeof document !== "undefined") injectStyles();
