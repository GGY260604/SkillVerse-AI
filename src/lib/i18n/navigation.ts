import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

// Localized Navigation Utilities
// Export locale-aware wrappers for Link, redirect, usePathname, and useRouter.
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);

