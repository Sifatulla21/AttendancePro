
"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, setMonth, setYear } from "date-fns"

interface MonthSelectorProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i.toString(),
  label: format(new Date(2024, i, 1), 'MMMM')
}));

const years = Array.from({ length: 10 }, (_, i) => ({
  value: (new Date().getFullYear() - 5 + i).toString(),
  label: (new Date().getFullYear() - 5 + i).toString()
}));

export function MonthSelector({ currentDate, onDateChange }: MonthSelectorProps) {
  return (
    <div className="flex gap-2 justify-center">
      <Select 
        value={currentDate.getMonth().toString()} 
        onValueChange={(val) => onDateChange(setMonth(currentDate, parseInt(val)))}
      >
        <SelectTrigger className="w-[140px] bg-card font-headline font-bold">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {months.map(m => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select 
        value={currentDate.getFullYear().toString()} 
        onValueChange={(val) => onDateChange(setYear(currentDate, parseInt(val)))}
      >
        <SelectTrigger className="w-[100px] bg-card font-headline font-bold">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map(y => (
            <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
