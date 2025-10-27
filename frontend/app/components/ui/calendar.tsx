import type * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { es } from "date-fns/locale"

import { cn } from "~/lib/utils"
import { buttonVariants } from "~/components/ui/button"
import "react-day-picker/style.css";

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 w-full", className)}
      locale={es}
      weekStartsOn={1}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 justify-center",
        month: "space-y-4 w-full",
        month_caption: "flex justify-center pt-1 relative items-center mb-3",
        caption_label: "text-base font-semibold text-foreground",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-80 hover:opacity-100 hover:bg-accent transition-all",
          "absolute left-1"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-80 hover:opacity-100 hover:bg-accent transition-all",
          "absolute right-1"
        ),
        month_grid: "w-full border-collapse mt-2",
        weekdays: "flex justify-between w-full mb-1",
        weekday: "text-muted-foreground rounded-md font-medium text-xs flex-1 flex items-center justify-center h-9 w-9",
        week: "flex w-full mt-1 justify-between",
        day: cn(
          "relative p-0 text-center text-sm flex-1 flex items-center justify-center",
          "focus-within:relative focus-within:z-20"
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-normal",
          "hover:bg-accent hover:text-accent-foreground hover:scale-105",
          "aria-selected:hover:bg-primary aria-selected:hover:brightness-110 aria-selected:hover:shadow-lg aria-selected:hover:scale-110",
          "rounded-lg transition-all duration-200 ease-in-out",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        ),
        range_end: "day-range-end",
        selected: cn(
          "bg-primary text-primary-foreground font-semibold",
          "hover:bg-primary hover:text-primary-foreground hover:brightness-110 hover:shadow-lg hover:scale-110",
          "focus:bg-primary focus:text-primary-foreground",
          "rounded-lg shadow-md scale-105",
          "transition-all duration-200 ease-in-out"
        ),
        today: cn(
          "bg-accent text-accent-foreground font-bold",
          "rounded-lg ring-2 ring-primary ring-offset-2"
        ),
        outside: cn(
          "day-outside text-muted-foreground opacity-40",
          "aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30"
        ),
        disabled: "text-muted-foreground opacity-40 cursor-not-allowed hover:bg-transparent hover:scale-100",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") {
            return <ChevronLeft className="h-4 w-4" />;
          }
          return <ChevronRight className="h-4 w-4" />;
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
