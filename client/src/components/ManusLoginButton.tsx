import { useState, type ComponentProps } from "react";

import { getLoginUrl } from "@/const";

import { ManusDialog } from "./ManusDialog";
import { Button } from "./ui/button";

type ManusLoginButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "type"> & {
  dialogTitle?: string;
  dialogDescription?: string;
  loginLabel?: string;
  logo?: string;
  returnTo?: string;
};

export function ManusLoginButton({
  children = "Continue with Manus",
  dialogTitle = "Continue with Manus",
  dialogDescription = "We’ll bring you right back to this page after you sign in.",
  loginLabel,
  logo,
  returnTo,
  ...buttonProps
}: ManusLoginButtonProps) {
  const [open, setOpen] = useState(false);

  const handleLogin = () => {
    window.location.href = getLoginUrl(returnTo);
  };

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} {...buttonProps}>
        {children}
      </Button>

      <ManusDialog
        open={open}
        onOpenChange={setOpen}
        onLogin={handleLogin}
        title={dialogTitle}
        description={dialogDescription}
        loginLabel={loginLabel}
        logo={logo}
      />
    </>
  );
}