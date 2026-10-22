// --- Localized Navigation Utilities ---
// Export locale-aware wrappers for Link, redirect, usePathname, and useRouter.
import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);


