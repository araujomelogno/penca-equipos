"use client";

interface FormInputProps {
  label: string;
  icon: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
  rightLabel?: string;
}

export default function FormInput({
  label,
  icon,
  type,
  placeholder,
  value,
  onChange,
  id,
  rightLabel,
}: FormInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-[10px] font-bold tracking-[3px]"
          style={{ color: "rgba(255, 225, 158, 0.6)" }}
        >
          {label}
        </label>
        {rightLabel && (
          <span
            className="text-[11px] font-semibold cursor-pointer"
            style={{ color: "rgba(255, 225, 158, 0.8)" }}
          >
            {rightLabel}
          </span>
        )}
      </div>
      <div className="relative">
        <span
          className="absolute left-3.5 top-3.5 material-symbols-outlined text-[20px]"
          style={{ color: "var(--color-text-placeholder)" }}
        >
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-[10px] py-3.5 pl-11 pr-4 text-sm focus:outline focus:outline-2 focus:outline-offset-[-1px]"
          style={{
            background: "var(--color-bg-input)",
            border: "1px solid var(--color-border-subtle)",
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-body)",
            outlineColor: "var(--color-accent-amber)",
          }}
          required
        />
      </div>
    </div>
  );
}
