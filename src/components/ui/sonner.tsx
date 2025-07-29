import { useTheme } from "next-themes"
import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner"

type ToasterProps = React.ComponentProps<typeof SonnerToaster>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        className: 'sm:top-4 sm:right-4 sm:left-auto sm:bottom-auto top-auto right-0 left-0 bottom-0 w-full max-w-full sm:max-w-sm',
        style: { zIndex: 99999 },
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, sonnerToast as toast }
