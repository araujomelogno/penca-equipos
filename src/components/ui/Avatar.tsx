import Image from "next/image";

interface AvatarProps {
  nickname: string;
  avatarUrl: string | null;
  size?: number;
}

export function Avatar({ nickname, avatarUrl, size = 40 }: AvatarProps) {
  return (
    <div
      className="shrink-0 flex items-center justify-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#1b1736",
        border: "1px solid #FFFFFF1A",
      }}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={nickname}
          width={size}
          height={size}
          className="object-cover"
          style={{ borderRadius: "50%", width: size, height: size }}
          unoptimized={avatarUrl.startsWith("/uploads/")}
        />
      ) : (
        <span
          className="font-bold select-none"
          style={{ color: "var(--color-text-primary)", fontSize: size * 0.35 }}
        >
          {nickname.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
