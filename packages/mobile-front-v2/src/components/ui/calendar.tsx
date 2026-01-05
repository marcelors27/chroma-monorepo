import DateTimePicker from "@react-native-community/datetimepicker";

interface CalendarProps {
  selected?: Date;
  onSelect?: (date?: Date) => void;
}

export function Calendar({ selected, onSelect }: CalendarProps) {
  const value = selected ?? new Date();

  return (
    <DateTimePicker
      value={value}
      mode="date"
      display="default"
      onChange={(_, date) => onSelect?.(date)}
    />
  );
}
