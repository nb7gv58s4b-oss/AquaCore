import { toast } from "sonner";

/** Run a store mutation, showing a success or a clear error message. */
export function safe(fn: () => void, ok: string): boolean {
  try {
    fn();
    toast.success(ok);
    return true;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Operazione non riuscita.");
    return false;
  }
}
