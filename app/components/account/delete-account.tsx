import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { useState } from "react";
import { Form } from "react-router";
import { useIsPending } from "~/hooks/use-is-pending";
import { useMediaQuery } from "~/hooks/use-media-query";
import { useUser } from "~/hooks/use-user";
import { cn } from "~/lib/utils";
import { schema } from "~/routes/account";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { Input } from "../ui/input";
import { StatusButton } from "../ui/status-button";

const MODAL_TITLE = "Delete account";
const MODAL_DESCRIPTION = (email: string) => (
  <>
    This action is irreversible. To confirm, please type{" "}
    <strong className="font-semibold">{email}</strong> in the box below.
  </>
);

export function DeleteAccount() {
  const user = useUser();
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isPending = useIsPending({
    formAction: "/account",
    formMethod: "DELETE",
  });

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h2 className="font-semibold text-base">{MODAL_TITLE}</h2>
        <p className="text-muted-foreground">
          Once you delete your account, you will not be able to sign in again.
          You will also lose access to your account and any data associated with
          it.
        </p>
      </header>
      <section>
        {isDesktop ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete account</Button>
            </DialogTrigger>
            <DialogContent
              aria-modal="true"
              aria-labelledby="alert-dialog"
              className="sm:max-w-[400px]"
            >
              <DialogHeader>
                <DialogTitle>{MODAL_TITLE}</DialogTitle>
                <DialogDescription>
                  {MODAL_DESCRIPTION(user.email)}
                </DialogDescription>
              </DialogHeader>
              <DeleteAccountForm isPending={isPending} />
            </DialogContent>
          </Dialog>
        ) : (
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
              <Button variant="destructive">Delete account</Button>
            </DrawerTrigger>
            <DrawerContent aria-modal="true" aria-labelledby="alert-drawer">
              <DrawerHeader className="text-left">
                <DrawerTitle>{MODAL_TITLE}</DrawerTitle>
                <DrawerDescription>
                  {MODAL_DESCRIPTION(user.email)}
                </DrawerDescription>
              </DrawerHeader>
              <DeleteAccountForm className="px-4" isPending={isPending} />
              <DrawerFooter className="pt-2">
                <DrawerClose asChild>
                  <Button variant="outline" disabled={isPending}>
                    Cancel
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        )}
      </section>
    </div>
  );
}

export function DeleteAccountForm({
  isPending,
  className,
}: React.ComponentProps<"form"> & { isPending: boolean }) {
  const [form, { email }] = useForm({
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    constraint: getZodConstraint(schema),
    shouldRevalidate: "onInput",
  });

  return (
    <Form
      method="DELETE"
      action="/account"
      className={cn("grid items-start gap-4", className)}
      preventScrollReset
      {...getFormProps(form)}
    >
      <div className="grid gap-2">
        <Input
          autoComplete="off"
          {...getInputProps(email, { type: "email" })}
        />
        {email.errors && (
          <p
            className="text-destructive text-xs"
            role="alert"
            aria-live="polite"
          >
            {email.errors.join(", ")}
          </p>
        )}
      </div>
      <StatusButton
        isLoading={isPending}
        text="Delete account"
        name="intent"
        value="deleteUser"
        type="submit"
      />
    </Form>
  );
}
