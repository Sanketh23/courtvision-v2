import * as React from "react";

import { cn } from "@/lib/utils";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    // Reusable primitive; callers supply htmlFor to associate with an input.
    // biome-ignore lint/a11y/noLabelWithoutControl: association is provided by consumers via htmlFor
    <label ref={ref} className={cn("text-sm font-medium text-gray-700", className)} {...props} />
  ),
);
Label.displayName = "Label";

export { Label };
