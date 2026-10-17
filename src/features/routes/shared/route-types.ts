export type ToastState = {
  message: string;
} & (
  | { tone: "success" | "info" | "warning" }
  | { tone: "error"; retry?: () => void }
);
