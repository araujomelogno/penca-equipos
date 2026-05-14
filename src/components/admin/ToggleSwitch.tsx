"use client";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ToggleSwitch({ checked, onChange, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        padding: 2,
        background: checked ? "#e9c46a66" : "#1b1736",
        border: `1px solid ${checked ? "#FFFFFF1A" : "#FFFFFF0D"}`,
        cursor: disabled ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        transition: "background 0.15s, justify-content 0.15s",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: checked ? "#ffe19e" : "#4a4668",
          transition: "background 0.15s",
        }}
      />
    </button>
  );
}
