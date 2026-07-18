import { toast as sonnerToast } from "sonner";

type Toast = {
  title?: string;
  description?: string;
};

function toast({ title, description, ...props }: Toast & Record<string, unknown>) {
  sonnerToast(title || "Notifikasi", {
    description,
    ...props,
  });
}

function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: (id?: string) => {
      if (id) sonnerToast.dismiss(id);
    },
  };
}

export { useToast, toast };
