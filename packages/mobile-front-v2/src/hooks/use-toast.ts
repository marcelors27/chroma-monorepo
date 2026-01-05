import { toast } from "@/lib/toast";

export const useToast = () => ({
  toasts: [],
  toast,
  dismiss: () => {},
});

export { toast };
