export type DropdownOption = {
  id: string;
  field_id: string;
  value: string;
  label: string;
  sort_order: number;
  active: boolean;
  created_at?: string;
};

export type DropdownField = {
  id: string;
  field_key: string;
  label: string;
  sort_order: number;
  active: boolean;
  created_at?: string;
  dropdown_options: DropdownOption[];
};